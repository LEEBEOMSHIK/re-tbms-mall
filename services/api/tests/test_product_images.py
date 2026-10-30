import base64
from io import BytesIO
from uuid import uuid4
from PIL import Image
from test_movement_reasons import setup

AUTH = {'Authorization': 'Bearer reason-test-only'}

def payload():
    buffer = BytesIO()
    Image.new('RGB', (8, 8), 'red').save(buffer, format='PNG')
    return {'id': str(uuid4()), 'kind': 'design', 'name': 'example.png', 'alt': 'Synthetic red design', 'data_url': 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode()}

def test_images_create_read_retry_delete(setup):
    store, sku, client = setup
    url = f"/api/v1/admin/products/{sku['product_id']}/images"
    body = payload()
    assert client.get(url).status_code == 401
    response = client.post(url, headers=AUTH, json=body)
    assert response.status_code == 201
    image = response.json()
    assert image['product_id'] == sku['product_id']
    assert client.post(url, headers=AUTH, json=body).json() == image
    assert client.get(url, headers=AUTH).json() == {'images': [image]}
    assert client.delete(f"{url}/{image['id']}", headers=AUTH).json() == {'id': image['id']}
    assert client.get(url, headers=AUTH).json() == {'images': []}

import json
import sqlite3
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.inventory import CatalogStore, ProductCreate
from app.product_images import MAX_BODY, MAX_BYTES

@pytest.mark.parametrize('method', ['get', 'post', 'delete'])
def test_all_image_methods_require_auth(setup, method):
    _, sku, client = setup
    url = f"/api/v1/admin/products/{sku['product_id']}/images"
    if method == 'delete': url += '/' + str(uuid4())
    assert getattr(client, method)(url).status_code == 401

@pytest.mark.parametrize('patch', [{'alt': None}, {'name': ''}, {'name': '   '}, {'id': 'bad'}, {'kind': 'public'}, {'data_url': 'data:image/svg+xml;base64,PHN2Zz4='}, {'data_url': 'data:image/gif;base64,R0lGODlh'}, {'data_url': 'data:image/png;base64,bm90YW5pbWFnZQ=='}, {'data_url': 'data:image/png;base64,!!!'}, {'alt': 'a'*241}, {'name': 'a'*121}])
def test_invalid_image_no_write(setup, patch):
    _, sku, client = setup
    url=f"/api/v1/admin/products/{sku['product_id']}/images"
    assert client.post(url,headers=AUTH,json={**payload(),**patch}).status_code == 422
    assert client.get(url,headers=AUTH).json()=={'images':[]}

def test_limits_mismatch_and_metadata(setup):
    _, sku, client=setup
    url=f"/api/v1/admin/products/{sku['product_id']}/images"
    assert client.post(url,headers=AUTH,content=b' '*(MAX_BODY+1)).status_code==413
    assert client.post(url,headers=AUTH,json={**payload(),'data_url':'data:image/png;base64,'+base64.b64encode(b'x'*(MAX_BYTES+1)).decode()}).status_code==422
    for fmt,mime in [('PNG','image/png'),('JPEG','image/jpeg'),('WEBP','image/webp')]:
        buf=BytesIO(); exif=Image.Exif(); exif[270]='Synthetic private metadata'; Image.new('RGB',(8,8),'blue').save(buf,format=fmt,exif=exif)
        body={**payload(),'data_url':f'data:{mime};base64,'+base64.b64encode(buf.getvalue()).decode()}
        response=client.post(url,headers=AUTH,json=body)
        assert response.status_code==201
        with Image.open(BytesIO(base64.b64decode(response.json()['data_url'].split(',')[1]))) as clean:
            assert not clean.getexif()
            assert 'exif' not in clean.info
    buf=BytesIO();Image.new('RGB',(4097,1)).save(buf,format='PNG')
    assert client.post(url,headers=AUTH,json={**payload(),'data_url':'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()}).status_code==422
    assert client.post(url,headers=AUTH,json={**payload(),'data_url':payload()['data_url'].replace('image/png','image/jpeg')}).status_code==422

def test_cap_idempotency_ownership_persistence_and_catalog_isolation(setup,tmp_path):
    store,sku,client=setup
    url=f"/api/v1/admin/products/{sku['product_id']}/images"
    before=store.get()
    first=payload(); image=client.post(url,headers=AUTH,json=first).json()
    assert client.post(url,headers=AUTH,json={**first,'alt':'Different'}).status_code==409
    other=store.create_product(ProductCreate(name='Other',category_id='tops-tee',seasons=['SP']))
    other_url=f"/api/v1/admin/products/{other['id']}/images"
    assert client.post(other_url,headers=AUTH,json=first).status_code==409
    assert client.delete(other_url+'/'+image['id'],headers=AUTH).status_code==404
    for _ in range(9): assert client.post(url,headers=AUTH,json=payload()).status_code==201
    assert client.post(url,headers=AUTH,json=payload()).status_code==409
    assert client.post(url,headers=AUTH,json=first).json()==image
    assert client.post(url,headers=AUTH,json={**payload(),'kind':'model'}).status_code==201
    fresh=TestClient(create_app(env_file=tmp_path/'missing',catalog_path=store.path))
    assert len(fresh.get(url,headers=AUTH).json()['images'])==11
    current=store.get()
    assert current['skus']==before['skus'] and current['movements']==before['movements']
    assert 'data_url' not in json.dumps(current)
    assert client.delete(url+'/'+image['id'],headers=AUTH).status_code==200
    assert client.delete(url+'/'+image['id'],headers=AUTH).status_code==404

def test_missing_product_and_product_delete_cascade(setup):
    store,_,client=setup
    url='/api/v1/admin/products/missing/images'
    assert client.get(url,headers=AUTH).status_code==404
    assert client.post(url,headers=AUTH,json=payload()).status_code==404
    assert client.delete(url+'/'+str(uuid4()),headers=AUTH).status_code==404
    product=store.create_product(ProductCreate(name='Remove',category_id='tops-tee',seasons=['SP']))
    url=f"/api/v1/admin/products/{product['id']}"
    image=client.post(url+'/images',headers=AUTH,json=payload()).json()
    assert client.request('DELETE',url,headers=AUTH,json={'version':0}).status_code==200
    with store.transaction() as db:
        assert db.execute('SELECT 1 FROM product_images WHERE id=?',(image['id'],)).fetchone() is None
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]

def test_v8_migration_preserves_all_rows(setup):
    store,_,_=setup
    before=store.get()
    with sqlite3.connect(store.path) as db:
        db.execute('DROP TABLE product_progress_history')
        db.execute('DROP TABLE production_history')
        db.execute('DROP TABLE production_requests')
        db.execute('DROP TABLE factory_image_shares')
        db.execute('DROP TABLE product_suppliers')
        db.execute('DROP TABLE factory_sessions')
        db.execute('DROP TABLE factory_login_limits')
        db.execute('DROP TABLE factory_accounts')
        db.execute('DROP TABLE product_images')
        db.execute('ALTER TABLE skus DROP COLUMN is_active')
        for table in ('review_history','product_reviews','publication_history','product_publications','shipment_stock_links','shipment_history','shipments'):
            db.execute(f'DROP TABLE IF EXISTS {table}')
        db.execute('ALTER TABLE products DROP COLUMN details')
        db.execute('PRAGMA user_version=8')
    assert CatalogStore(store.path).get()==before
    with sqlite3.connect(store.path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==17
        assert db.execute('SELECT COUNT(*) FROM product_images').fetchone()[0]==0

@pytest.mark.parametrize('size', [(4096, 4096), (5000, 1)])
def test_raster_dimensions_rejected(setup, size):
    _,sku,client=setup
    buf=BytesIO(); Image.new('RGB',size).save(buf,format='PNG')
    url=f"/api/v1/admin/products/{sku['product_id']}/images"
    body={**payload(),'data_url':'data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()}
    assert client.post(url,headers=AUTH,json=body).status_code==422


def test_animation_and_truncated_raster_rejected(setup):
    _,sku,client=setup
    url=f"/api/v1/admin/products/{sku['product_id']}/images"
    buf=BytesIO(); Image.new('RGB',(8,8),'red').save(buf,format='PNG',save_all=True,append_images=[Image.new('RGB',(8,8),'blue')],duration=100,loop=0)
    for data in [buf.getvalue(),base64.b64decode(payload()['data_url'].split(',')[1])[:40]]:
        body={**payload(),'data_url':'data:image/png;base64,'+base64.b64encode(data).decode()}
        assert client.post(url,headers=AUTH,json=body).status_code==422


def test_schema9_migration_failure_rolls_back(setup):
    store,_,_=setup
    with sqlite3.connect(store.path) as db:
        db.execute('DROP TABLE product_progress_history')
        db.execute('DROP TABLE production_history')
        db.execute('DROP TABLE production_requests')
        db.execute('DROP TABLE factory_image_shares')
        db.execute('DROP TABLE product_suppliers')
        db.execute('DROP TABLE factory_sessions')
        db.execute('DROP TABLE factory_login_limits')
        db.execute('DROP TABLE factory_accounts')
        db.execute('DROP TABLE product_images')
        db.execute('CREATE TABLE product_images (unexpected TEXT)')
        db.execute('ALTER TABLE skus DROP COLUMN is_active')
        for table in ('review_history','product_reviews','publication_history','product_publications','shipment_stock_links','shipment_history','shipments'):
            db.execute(f'DROP TABLE IF EXISTS {table}')
        db.execute('ALTER TABLE products DROP COLUMN details')
        db.execute('PRAGMA user_version=8')
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as error:
        store.get()
    assert error.value.status_code==503
    with sqlite3.connect(store.path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==8
        assert db.execute("PRAGMA table_info(product_images)").fetchone()[1]=='unexpected'


@pytest.mark.parametrize('description', ['', '   ', 'a' * 240, None])
def test_optional_description_create_read_and_retry(setup, description):
    _, sku, client = setup
    url = f"/api/v1/admin/products/{sku['product_id']}/images"
    body = payload()
    if description is None:
        body.pop('alt')
    else:
        body['alt'] = description
    response = client.post(url, headers=AUTH, json=body)
    assert response.status_code == 201
    expected = (description or '').strip()
    image = response.json()
    assert image['alt'] == expected and image['name'] == body['name']
    assert client.get(url, headers=AUTH).json() == {'images': [image]}
    assert client.post(url, headers=AUTH, json={**body, 'alt': expected}).json() == image


def test_image_name_is_still_required(setup):
    _, sku, client = setup
    body = payload()
    body.pop('name')
    url = f"/api/v1/admin/products/{sku['product_id']}/images"
    assert client.post(url, headers=AUTH, json=body).status_code == 422
    assert client.get(url, headers=AUTH).json() == {'images': []}
