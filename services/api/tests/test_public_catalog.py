import json
import sqlite3
from uuid import uuid4
import pytest
from app.public_catalog import PublicCatalog
from app.inventory import CatalogStore
from test_inventory import setup, sku, snapshot, AUTH, BASE
from test_product_images import payload as image_payload


def prepared(client):
    option=sku(client); pid=option['product_id']
    product=snapshot(client)['products'][0]
    assert client.put(BASE+'/products/'+pid,headers=AUTH,json={k:product[k] for k in ['name','category_id','seasons','version']}|{'description':'Public cotton shirt'}).status_code==200
    image=image_payload()|{'kind':'garment'}
    assert client.post(BASE+f'/products/{pid}/images',headers=AUTH,json=image).status_code==201
    assert client.post(BASE+'/inventory/movements',headers=AUTH,json={'sku_id':option['id'],'version':0,'delta':4,'reason_code':'adjust_in','request_id':str(uuid4())}).status_code==200
    return pid,option,image


def publish(client,pid,version=0,status='published',price=12000):
    return client.put(BASE+f'/products/{pid}/publication',headers=AUTH,json={'version':version,'status':status,'price':price})


def test_drafts_are_private_and_publish_gates_are_server_enforced(setup):
    client,_,_=setup
    option=sku(client);pid=option['product_id']
    assert client.get('/api/v1/products').json()['products']==[]
    assert client.get('/api/v1/products/'+pid).status_code==404
    state=client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()
    assert state['status']=='draft' and not state['can_publish'] and len(state['reasons'])==3
    assert publish(client,pid).status_code==422
    assert client.get(BASE+f'/products/{pid}/publication').status_code==401
    assert client.put(BASE+f'/products/{pid}/publication',json={'status':'published','price':0,'version':0}).status_code==401


def test_public_allowlist_images_pause_and_conflict(setup):
    client,_,_=setup;pid,option,image=prepared(client)
    design=image_payload();assert client.post(BASE+f'/products/{pid}/images',headers=AUTH,json=design).status_code==201
    assert publish(client,pid).status_code==200
    p=client.get('/api/v1/products/'+pid).json()
    assert p['price']==12000 and not p['sold_out']
    assert client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()['public_visible'] is True
    raw=json.dumps(p)
    for private in ['internal_name','on_hand','reorder_point','supplier','data_url','request_hash']:
        assert private not in raw
    assert all(i['kind'] in ['model','garment'] for i in p['images'])
    assert design['id'] not in raw
    assert p['options']==[{'id':option['id'],'color':option['color'],'size':option['size'],'available':True}]
    response=client.get(p['image']);assert response.status_code==200 and response.headers['cache-control']=='no-store'
    assert client.get(f"/api/v1/products/{pid}/images/{design['id']}").status_code==404
    assert client.get(f"/api/v1/products/wrong/images/{image['id']}").status_code==404
    assert publish(client,pid).status_code==409
    assert publish(client,pid,1,'paused').status_code==200
    assert client.get('/api/v1/products/'+pid).status_code==404
    assert client.get(p['image']).status_code==404
    assert publish(client,pid,2).status_code==200
    assert len(client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()['history'])==3


def test_sold_out_remains_public_and_price_edit_but_republish_requires_stock(setup):
    client,_,_=setup;pid,option,_=prepared(client);assert publish(client,pid).status_code==200
    assert client.post(BASE+'/inventory/movements',headers=AUTH,json={'sku_id':option['id'],'version':1,'delta':-4,'reason_code':'sale','request_id':str(uuid4())}).status_code==200
    assert client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()['public_visible'] is True
    p=client.get('/api/v1/products/'+pid).json();assert p['sold_out'] and not p['options'][0]['available']
    assert publish(client,pid,1,price=None).status_code==200
    assert client.get('/api/v1/products/'+pid).json()['price'] is None
    assert publish(client,pid,2,'paused').status_code==200
    assert publish(client,pid,3).status_code==422


@pytest.mark.parametrize('change',['image','sku','category','description'])
def test_public_reads_fail_closed_when_eligibility_lost(setup,change):
    client,path,_=setup;pid,option,image=prepared(client);assert publish(client,pid).status_code==200
    if change=='image': assert client.delete(BASE+f"/products/{pid}/images/{image['id']}",headers=AUTH).status_code==200
    elif change=='sku': assert client.put(BASE+f"/skus/{option['id']}/settings",headers=AUTH,json={'version':1,'is_active':False,'reorder_point':0}).status_code==200
    else:
        with sqlite3.connect(path) as db:
            if change=='category': db.execute('UPDATE categories SET is_active=0 WHERE id=(SELECT category_id FROM products WHERE id=?)',(pid,))
            else: db.execute("UPDATE products SET description='' WHERE id=?",(pid,))
    assert client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()['public_visible'] is False
    assert client.get('/api/v1/products').json()['products']==[]
    assert client.get('/api/v1/products/'+pid).status_code==404
    assert client.get(f"/api/v1/products/{pid}/images/{image['id']}").status_code==404


@pytest.mark.parametrize('patch',[{'price':-1},{'price':True},{'price':1000000001},{'version':True},{'status':'sale'},{'internal_name':'leak'}])
def test_invalid_publication_fields(setup,patch):
    client,_,_=setup;pid,_,_=prepared(client)
    assert client.put(BASE+f'/products/{pid}/publication',headers=AUTH,json={'status':'draft','price':None,'version':0}|patch).status_code==422


def test_merchandising_uses_actual_products_without_auto_publication(setup):
    client,_,_=setup;pid,_,_=prepared(client)
    current=client.get(BASE+'/storefront',headers=AUTH).json()
    assert len(current['products'])==1 and current['products'][0]['publication_status']=='draft'
    sections=[{'id':'season','title':'Season','subtitle':'','kind':'collection','enabled':True,'product_ids':[pid]}]
    assert client.put(BASE+'/storefront',headers=AUTH,json={'revision':current['revision'],'sections':sections}).status_code==200
    assert client.get('/api/v1/storefront').json()['products']==[]
    assert publish(client,pid).status_code==200
    public=client.get('/api/v1/storefront').json();assert public['sections'][0]['product_ids']==[pid]
    assert public['products'][0]['id']==pid
    assert publish(client,pid,1,'paused').status_code==200
    assert client.get('/api/v1/storefront').json()['sections']==[]


def test_schema13_backup_preserves_original_rows_and_no_auto_publish(setup):
    client,path,_=setup;pid,_,_=prepared(client)
    before=snapshot(client)
    with sqlite3.connect(path) as db:
        db.execute('DROP TABLE review_history');db.execute('DROP TABLE product_reviews');db.execute('DROP TABLE publication_history');db.execute('DROP TABLE product_publications');db.execute('PRAGMA user_version=13')
    after=snapshot(client)
    assert before==after
    assert client.get('/api/v1/products').json()['products']==[]
    backups=list(path.parent.glob(path.name+'.pre-v14-*.bak'));assert backups
    with sqlite3.connect(backups[0]) as db: assert db.execute('PRAGMA user_version').fetchone()[0]==13
    with sqlite3.connect(path) as db: assert db.execute('PRAGMA user_version').fetchone()[0]==16

def test_publication_concurrent_versions_allow_one_writer(setup):
    from concurrent.futures import ThreadPoolExecutor
    client,_,_=setup;pid,_,_=prepared(client)
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses=list(pool.map(lambda _:publish(client,pid).status_code,range(2)))
    assert sorted(statuses)==[200,409]
    state=client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()
    assert state['version']==1 and len(state['history'])==1


def test_legacy_section_settings_are_not_rewritten_on_read(setup):
    client,path,_=setup
    settings=path.parent/'storefront.json'
    legacy={'revision':4,'sections':[{'id':'old','title':'Old season','subtitle':'Keep me','kind':'collection','enabled':True,'product_ids':['p001']}]}
    settings.write_text(json.dumps(legacy),encoding='utf-8')
    original=settings.read_bytes()
    public=client.get('/api/v1/storefront').json();assert public['sections']==[]
    admin=client.get(BASE+'/storefront',headers=AUTH).json()
    assert admin['sections'][0]['title']=='Old season' and admin['sections'][0]['product_ids']==[]
    assert settings.read_bytes()==original
    assert client.put(BASE+'/storefront',headers=AUTH,json={'revision':4,'sections':admin['sections']}).status_code==200
