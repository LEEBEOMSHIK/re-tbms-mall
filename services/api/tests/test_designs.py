import base64
import io
import json
from uuid import uuid4

import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
from PIL import Image, PngImagePlugin

PREFIX = '/api/v1/admin/designs'
def uid(): return str(uuid4())

@pytest.fixture
def client(tmp_path):
    from app.designs import register_design_routes
    app = FastAPI()
    def auth(authorization: str | None = Header(None)):
        if authorization != 'Bearer admin': raise HTTPException(401)
    register_design_routes(app, auth, tmp_path / 'designs.db')
    with TestClient(app, headers={'Authorization': 'Bearer admin'}) as value:
        yield value

def create(c, **changes):
    body = dict(request_id=uid(), name='Test garment', template_id='tshirt', template_version=1)
    body.update(changes)
    return c.post(PREFIX, json=body)

def image_url(animated=False):
    out = io.BytesIO()
    image = Image.new('RGBA', (20, 20), (255, 0, 0, 100))
    meta = PngImagePlugin.PngInfo(); meta.add_text('private', 'remove this')
    if animated:
        image.save(out, format='PNG', save_all=True, append_images=[Image.new('RGBA',(20,20),'blue')])
    else: image.save(out, format='PNG', pnginfo=meta)
    return 'data:image/png;base64,' + base64.b64encode(out.getvalue()).decode()

def asset(c,p, **changes):
    body = dict(request_id=uid(), data_url=image_url()); body.update(changes)
    return c.post(f'{PREFIX}/{p}/assets', json=body)

def legacy_document(record):
    document = dict(record['document'])
    document.pop('studio', None)
    document['schema_version'] = 1
    return document

def layer(a):
    return dict(id=uid(), technique='print', surface_id='front', asset_id=a, center={'x':.5,'y':.49},size={'width':.5,'height':.5},rotation_degrees=0,visible=True)

def save(c,p,doc,version=1,**changes):
    body = dict(request_id=uid(),base_version=version,name='Saved',document=doc);body.update(changes)
    return c.patch(f'{PREFIX}/{p}',json=body)

def test_roundtrip_receipts_conflicts_and_pagination(client):
    request=uid(); result=create(client,request_id=request)
    assert result.status_code==201
    record=result.json(); p=record['id']
    assert record['document']['base_color']=='#e8e5df'
    assert create(client,request_id=request).json()==record
    assert create(client,request_id=request,name='Different').status_code==409
    d=record['document']; d['gloss']=1
    request=uid(); updated=save(client,p,d,request_id=request)
    assert updated.status_code==200
    assert updated.json()['version']==2
    assert save(client,p,d,request_id=request).json()==updated.json()
    assert save(client,p,d).status_code==409
    assert client.get(f'{PREFIX}/{p}').json()==updated.json()
    listing=client.get(PREFIX,params={'q':'Saved','size':10}).json()
    assert listing['total']==1 and listing['items'][0]['id']==p
    assert client.get(PREFIX,params={'size':11}).status_code==422

@pytest.mark.parametrize('field,value', [('template_id','other'),('template_version',2),('name',' '),('name','x'*121)])
def test_create_rejects_invalid_contract(client,field,value):
    assert create(client,**{field:value}).status_code==422

@pytest.mark.parametrize('field,value', [('schema_version',3),('template_id','hoodie'),('material_id','unknown'),('material_version',2),('base_color','red'),('gloss',1.01)])
def test_document_invalid_fields(client,field,value):
    r=create(client).json();d=r['document'];d[field]=value
    assert save(client,r['id'],d).status_code==422

def test_asset_sanitized_and_copy_remaps(client):
    r=create(client).json(); p=r['id']; request=uid()
    a=asset(client,p,request_id=request); assert a.status_code==201
    assert asset(client,p,request_id=request).json()==a.json()
    meta=a.json(); content=client.get(f'{PREFIX}/{p}/assets/{meta["id"]}')
    assert content.status_code==200 and content.headers['content-type']=='image/png'
    decoded=Image.open(io.BytesIO(content.content)); assert decoded.mode=='RGBA' and 'private' not in decoded.info
    d=legacy_document(r);d['decorations']=[layer(meta['id'])]
    assert save(client,p,d).status_code==200
    payload=dict(request_id=uid(),name='Copy',document=d)
    copied=client.post(f'{PREFIX}/{p}/copies',json=payload)
    assert copied.status_code==201
    cr=copied.json(); assert cr['id']!=p and cr['version']==1
    new_asset=cr['document']['decorations'][0]['asset_id'];assert new_asset!=meta['id']
    assert client.get(f'{PREFIX}/{cr["id"]}/assets/{new_asset}').content==content.content
    assert client.post(f'{PREFIX}/{p}/copies',json=payload).json()==cr
    assert client.get(f'{PREFIX}/{cr["id"]}/assets/{meta["id"]}').status_code==404
    foreign=create(client).json();foreign['document']=legacy_document(foreign);foreign['document']['decorations']=[layer(meta['id'])]
    assert save(client,foreign['id'],foreign['document']).status_code==422

def test_rotated_overflow_duplicate_layers_and_layer_limit(client):
    r=create(client).json(); p=r['id']; a=asset(client,p).json()['id']; d=legacy_document(r)
    d['decorations']=[layer(a)];d['decorations'][0]['rotation_degrees']=45
    assert save(client,p,d).status_code==422
    d['decorations']=[layer(a) for _ in range(21)]
    assert save(client,p,d).status_code==422
    d['decorations']=d['decorations'][:20]
    assert save(client,p,d).status_code==200
    d['decorations']=[layer(a)]*2
    assert save(client,p,d,version=2).status_code==422

@pytest.mark.parametrize('data', ['data:image/svg+xml;base64,PHN2Zy8+','https://example.org/a.png','data:image/png;base64,bm90LWltYWdl'])
def test_bad_uploads(client,data):
    p=create(client).json()['id']; assert asset(client,p,data_url=data).status_code==422

def test_animation_asset_quota_and_missing_projects(client):
    p=create(client).json()['id'];assert asset(client,p,data_url=image_url(True)).status_code==422
    for _ in range(40): assert asset(client,p).status_code==201
    assert asset(client,p).status_code==422
    assert asset(client,uid()).status_code==404

def test_auth_and_stream_limits_and_nan(client):
    for token in ['', 'Bearer factory']:
        assert client.get(PREFIX,headers={'Authorization':token}).status_code==401
        assert client.post(PREFIX,content=b'x'*300000,headers={'Authorization':token}).status_code==401
    assert client.post(PREFIX,content=iter([b'x'*140000,b'x'*140000])).status_code==413
    r=create(client).json();d=r['document'];d['gloss']=float('nan')
    body=json.dumps(dict(request_id=uid(),base_version=1,name='NaN',document=d))
    assert client.patch(f'{PREFIX}/{r["id"]}',content=body).status_code==422
    assert client.post(f'{PREFIX}/{r["id"]}/assets',content=iter([b'x'*1600000]*2)).status_code==413


def test_boolean_versions_are_not_numeric_versions(client):
    assert create(client,template_version=True).status_code==422
    r=create(client).json();d=r['document'];d['schema_version']=True
    assert save(client,r['id'],d).status_code==422

def test_image_size_and_dimensions_limits(client):
    p=create(client).json()['id']
    for raw in [b'x'*(2*1024*1024+1)]:
        assert asset(client,p,data_url='data:image/png;base64,'+base64.b64encode(raw).decode()).status_code==422
    for dimensions in [(4097,1),(4001,4000)]:
        out=io.BytesIO();Image.new('RGB',dimensions).save(out,format='PNG')
        assert asset(client,p,data_url='data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()).status_code==422
    out=io.BytesIO();Image.new('RGB',(4096,1)).save(out,format='PNG')
    assert asset(client,p,data_url='data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()).status_code==201

def test_two_simultaneous_writers_only_one_wins_and_history_remains(client,tmp_path):
    import sqlite3
    from concurrent.futures import ThreadPoolExecutor
    r=create(client).json();p=r['id']
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:save(client,p,r['document']),range(2)))
    assert sorted(response.status_code for response in results)==[200,409]
    with sqlite3.connect(tmp_path/'designs.db') as db:
        rows=db.execute('SELECT version,name FROM versions WHERE project_id=? ORDER BY version',(p,)).fetchall()
    assert rows==[(1,'Test garment'),(2,'Saved')]

def test_new_database_sets_version_without_backup(client, tmp_path):
    import sqlite3
    assert create(client).status_code == 201
    with sqlite3.connect(tmp_path / 'designs.db') as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 1
    assert list(tmp_path.glob('*.backup-*.sqlite3')) == []


def test_legacy_database_migration_backs_up_once_and_preserves_data(client, tmp_path):
    import sqlite3
    from concurrent.futures import ThreadPoolExecutor
    from app.designs.store import DesignStore
    record = create(client).json()
    path = tmp_path / 'designs.db'
    with sqlite3.connect(path) as db:
        db.execute('PRAGMA user_version=0')
        before = list(db.iterdump())
    with ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(lambda _: DesignStore(path).get(record['id']), range(4)))
    assert all(item == record for item in records)
    backups = list(tmp_path.glob('*.backup-*.sqlite3'))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as backup:
        assert backup.execute('PRAGMA user_version').fetchone()[0] == 0
        assert list(backup.iterdump()) == before
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 1
        assert list(db.iterdump()) == before


def test_future_database_rejected_without_any_mutation(client, tmp_path):
    import sqlite3
    path = tmp_path / 'designs.db'
    with sqlite3.connect(path) as db:
        db.execute('CREATE TABLE future_only(value TEXT)')
        db.execute("INSERT INTO future_only VALUES('preserve')")
        db.execute('PRAGMA user_version=2')
    before = path.read_bytes()
    assert client.get(PREFIX).status_code == 503
    assert create(client).status_code == 503
    assert path.read_bytes() == before
    assert list(tmp_path.glob('*.backup-*.sqlite3')) == []


def test_reencoded_image_over_two_mib_is_rejected_without_asset(client):
    import random
    out = io.BytesIO()
    image = Image.frombytes('RGB', (1100, 1100), random.Random(17).randbytes(1100 * 1100 * 3))
    image.save(out, format='JPEG', quality=90)
    raw = out.getvalue()
    assert len(raw) < 2 * 1024 * 1024
    decoded = Image.open(io.BytesIO(raw)); png = io.BytesIO(); decoded.save(png, format='PNG')
    assert len(png.getvalue()) > 2 * 1024 * 1024
    p = create(client).json()['id']
    response = asset(client, p, data_url='data:image/jpeg;base64,' + base64.b64encode(raw).decode())
    assert response.status_code == 422
    assert client.get(f'{PREFIX}/{p}').json()['assets'] == []

def test_unrecognized_legacy_schema_is_not_migrated(client, tmp_path):
    import sqlite3
    path = tmp_path / 'designs.db'
    with sqlite3.connect(path) as db:
        db.execute('CREATE TABLE unrelated(value TEXT)')
    before = path.read_bytes()
    assert client.get(PREFIX).status_code == 503
    assert path.read_bytes() == before
    assert list(tmp_path.glob('*.backup-*.sqlite3')) == []


def test_wool_preset_roundtrip_and_unknown_material_still_rejected(client):
    materials = client.get(f'{PREFIX}/materials').json()['materials']
    assert any(m['id'] == 'wool' and m['name'] == '울 스토키네트 니트' for m in materials)
    record = create(client).json()
    document = legacy_document(record)
    document['material_id'] = 'wool'
    result = save(client, record['id'], document)
    assert result.status_code == 200
    assert client.get(f"{PREFIX}/{record['id']}").json()['document']['material_id'] == 'wool'
    document['material_id'] = 'unregistered-fabric'
    assert save(client, record['id'], document, version=2).status_code == 422

