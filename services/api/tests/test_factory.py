from uuid import uuid4
import pytest
from test_movement_reasons import setup
from app.inventory import SupplierCreate

def assignment(client, url, body):
    product_id=url.split('/')[-2]
    catalog=client.get('/api/v1/admin/catalog',headers=AUTH).json()
    version=next((p['version'] for p in catalog['products'] if p['id']==product_id),0)
    return client.put(url,headers=AUTH,json={'version':version,**body})

AUTH={'Authorization':'Bearer reason-test-only'}
PASSWORD='Synthetic-Only-Password-123'

def test_factory_accounts_and_workspace(setup):
    store,sku,client=setup
    supplier=store.create_supplier(SupplierCreate(name='Factory A',is_active=True))
    response=client.post('/api/v1/admin/factory-accounts',headers=AUTH,json={'supplier_id':supplier['id'],'username':'factory.a','display_name':'Factory A','password':PASSWORD,'is_active':True})
    assert response.status_code==201
    assert 'password_hash' not in response.text

import hashlib
import json
import sqlite3
import time
from concurrent.futures import ThreadPoolExecutor
from app.inventory import ProductCreate
from test_product_images import payload as image_payload
from app.factory import FactoryStore, ProductionCreate, FactoryLogin

@pytest.fixture
def factory_setup(setup):
    store,sku,client=setup
    supplier=store.create_supplier(SupplierCreate(name='Factory A',is_active=True))
    supplier_b=store.create_supplier(SupplierCreate(name='Factory B',is_active=True))
    accounts=[]; tokens=[]
    for suffix,s in [('a',supplier),('b',supplier_b)]:
        account=client.post('/api/v1/admin/factory-accounts',headers=AUTH,json={'supplier_id':s['id'],'username':'factory.'+suffix,'display_name':'Factory '+suffix,'password':PASSWORD,'is_active':True}).json()
        accounts.append(account)
        login=client.post('/api/v1/factory/login',json={'username':'factory.'+suffix,'password':PASSWORD})
        assert login.status_code==200
        tokens.append({'Authorization':'Bearer '+login.json()['token']})
    assert assignment(client,f"/api/v1/admin/products/{sku['product_id']}/suppliers",{'supplier_ids':[supplier['id']]}).status_code==200
    return store,sku,client,supplier,supplier_b,accounts,tokens


def request_body(sku,supplier):
    return {'id':str(uuid4()),'product_id':sku['product_id'],'supplier_id':supplier['id'],'lines':[{'sku_id':sku['id'],'quantity':3}],'due_date':'2027-01-01','note':'Shared manufacturing note'}


def test_role_boundaries_scoped_workspace_and_no_secrets(factory_setup):
    store,sku,client,supplier,supplier_b,accounts,tokens=factory_setup
    assert client.get('/api/v1/admin/catalog',headers=tokens[0]).status_code==401
    assert client.get('/api/v1/admin/factory-workspace',headers=tokens[0]).status_code==401
    assert client.get('/api/v1/factory/workspace',headers=AUTH).status_code==401
    a=client.get('/api/v1/factory/workspace',headers=tokens[0]).json()
    b=client.get('/api/v1/factory/workspace',headers=tokens[1]).json()
    assert [p['id'] for p in a['products']]==[sku['product_id']] and b['products']==[]
    assert set(a['products'][0]['skus'][0])=={'id','code','color','size'}
    assert not {'description','on_hand','reorder_point','phone','data_url','password_hash'} & set(a['products'][0])
    assert supplier_b['id'] not in json.dumps(a)
    admin=client.get('/api/v1/admin/factory-workspace',headers=AUTH)
    assert PASSWORD not in admin.text and 'password_hash' not in admin.text and 'token_hash' not in admin.text
    with store.transaction() as db:
        rows=db.execute('SELECT password_hash FROM factory_accounts').fetchall()
        assert rows[0][0]!=rows[1][0] and all(PASSWORD not in r[0] for r in rows)
        hashes=[r[0] for r in db.execute('SELECT token_hash FROM factory_sessions')]
        assert tokens[0]['Authorization'].split()[1] not in hashes


def test_single_supplier_assignment_and_live_revocation(factory_setup):
    store,sku,client,supplier,supplier_b,accounts,tokens=factory_setup
    url=f"/api/v1/admin/products/{sku['product_id']}/suppliers"
    assert assignment(client,url,{'supplier_ids':[supplier['id'],supplier_b['id']]}).status_code==422
    assert assignment(client,url,{'supplier_ids':[supplier_b['id']]}).status_code==200
    assert client.get('/api/v1/factory/workspace',headers=tokens[0]).json()['products']==[]
    assert len(client.get('/api/v1/factory/workspace',headers=tokens[1]).json()['products'])==1
    assert client.get(f"/api/v1/factory/products/{sku['product_id']}/images",headers=tokens[0]).status_code==404
    assert assignment(client,url,{'supplier_ids':['missing']}).status_code==404
    assert assignment(client,'/api/v1/admin/products/missing/suppliers',{'supplier_ids':[]}).status_code==404


def test_production_transitions_ownership_idempotency_and_stock(factory_setup):
    store,sku,client,supplier,supplier_b,accounts,tokens=factory_setup
    before=store.get();body=request_body(sku,supplier)
    url='/api/v1/admin/production-requests'
    response=client.post(url,headers=AUTH,json=body);assert response.status_code==201
    request=response.json();rid=request['id']
    assert client.post(url,headers=AUTH,json=body).json()==request
    assert client.post(url,headers=AUTH,json={**body,'note':'Changed'}).status_code==409
    assert request['history'][0]['actor']=='local-admin'
    assert client.get('/api/v1/factory/workspace',headers=tokens[1]).json()['requests']==[]
    status_url=f'/api/v1/factory/production-requests/{rid}/status'
    assert client.put(status_url,headers=tokens[1],json={'status':'accepted','version':0}).status_code==404
    assert client.put(status_url,headers=tokens[0],json={'status':'ready','version':0}).status_code==409
    assert assignment(client,f"/api/v1/admin/products/{sku['product_id']}/suppliers",{'supplier_ids':[]}).status_code==409
    for version,status in enumerate(['accepted','in_production','ready']):
        response=client.put(status_url,headers=tokens[0],json={'status':status,'version':version})
        assert response.status_code==200
        assert response.json()['history'][-1]['actor']==accounts[0]['id']
        assert len(response.json()['history'])==version+2
        assert client.put(status_url,headers=tokens[0],json={'status':status,'version':version}).status_code==409
    assert client.put(f'{url}/{rid}/status',headers=AUTH,json={'status':'cancelled','version':3}).status_code==409
    after=store.get();assert after['skus']==before['skus'] and after['movements']==before['movements']
    assert assignment(client,f"/api/v1/admin/products/{sku['product_id']}/suppliers",{'supplier_ids':[]}).status_code==200
    assert client.get('/api/v1/factory/workspace',headers=tokens[0]).json()['requests']==[]


def test_cancel_only_submitted_and_snapshot_preserved(factory_setup):
    store,sku,client,supplier,_,_,tokens=factory_setup
    body=request_body(sku,supplier)
    request=client.post('/api/v1/admin/production-requests',headers=AUTH,json=body).json()
    url=f"/api/v1/admin/production-requests/{request['id']}/status"
    assert client.put(url,headers=tokens[0],json={'status':'cancelled','version':0}).status_code==401
    response=client.put(url,headers=AUTH,json={'status':'cancelled','version':0})
    assert response.status_code==200 and response.json()['history'][-1]['actor']=='local-admin'
    assert client.put(f"/api/v1/factory/production-requests/{request['id']}/status",headers=tokens[0],json={'status':'accepted','version':1}).status_code==409
    with store.transaction() as db:
        db.execute('UPDATE products SET name=? WHERE id=?',('Renamed',sku['product_id']))
    assert client.get('/api/v1/admin/factory-workspace',headers=AUTH).json()['requests'][0]['product_name']==request['product_name']


@pytest.mark.parametrize('patch',[{'lines':[]},{'lines':[{'sku_id':'missing','quantity':1}]},{'lines':[{'sku_id':'unused','quantity':0}]},{'lines':[{'sku_id':'unused','quantity':True}]},{'lines':[{'sku_id':'unused','quantity':1000001}]},{'due_date':'2027-02-30'},{'due_date':'20270101'},{'supplier_id':'missing'},{'id':'invalid'}])
def test_invalid_production_request_does_not_write(setup,patch):
    store,sku,client=setup
    supplier=store.create_supplier(SupplierCreate(name='Factory',is_active=True))
    assignment(client,f"/api/v1/admin/products/{sku['product_id']}/suppliers",{'supplier_ids':[supplier['id']]})
    response=client.post('/api/v1/admin/production-requests',headers=AUTH,json={**request_body(sku,supplier),**patch})
    assert response.status_code in (404,422)
    assert client.get('/api/v1/admin/factory-workspace',headers=AUTH).json()['requests']==[]


def test_duplicate_sku_other_product_and_unassigned_request(setup):
    store,sku,client=setup;supplier=store.create_supplier(SupplierCreate(name='Factory',is_active=True))
    body=request_body(sku,supplier)
    assert client.post('/api/v1/admin/production-requests',headers=AUTH,json=body).status_code==404
    other=store.create_product(ProductCreate(name='Other',category_id='tops-tee',seasons=['SP']))
    assignment(client,f"/api/v1/admin/products/{other['id']}/suppliers",{'supplier_ids':[supplier['id']]})
    assert client.post('/api/v1/admin/production-requests',headers=AUTH,json={**body,'product_id':other['id']}).status_code==422
    assert client.post('/api/v1/admin/production-requests',headers=AUTH,json={**body,'lines':body['lines']*2}).status_code==422


def test_disable_reset_expiry_logout_and_supplier_inactive(factory_setup):
    store,sku,client,supplier,_,accounts,tokens=factory_setup
    account=accounts[0];url=f"/api/v1/admin/factory-accounts/{account['id']}"
    assert client.put(url,headers=AUTH,json={'display_name':'Factory','is_active':False,'version':0}).status_code==200
    assert client.get('/api/v1/factory/workspace',headers=tokens[0]).status_code==401
    assert client.post('/api/v1/factory/login',json={'username':'factory.a','password':PASSWORD}).status_code==401
    assert client.put(url,headers=AUTH,json={'display_name':'Factory','is_active':True,'version':1,'password':'New-Only-Password-456'}).status_code==200
    assert client.post('/api/v1/factory/login',json={'username':'factory.a','password':PASSWORD}).status_code==401
    login=client.post('/api/v1/factory/login',json={'username':'factory.a','password':'New-Only-Password-456'});assert login.status_code==200
    auth={'Authorization':'Bearer '+login.json()['token']}
    assert client.put(url,headers=AUTH,json={'display_name':'Factory','is_active':True,'version':2,'password':PASSWORD}).status_code==200
    assert client.get('/api/v1/factory/workspace',headers=auth).status_code==401
    login=client.post('/api/v1/factory/login',json={'username':'factory.a','password':PASSWORD}).json();auth={'Authorization':'Bearer '+login['token']}
    assert client.post('/api/v1/factory/logout',headers=auth).status_code==200
    assert client.get('/api/v1/factory/workspace',headers=auth).status_code==401
    with store.transaction() as db:db.execute('UPDATE factory_sessions SET expires_at=0')
    assert client.get('/api/v1/factory/workspace',headers=tokens[1]).status_code==401
    login=client.post('/api/v1/factory/login',json={'username':'factory.a','password':PASSWORD}).json();auth={'Authorization':'Bearer '+login['token']}
    with store.transaction() as db:db.execute('UPDATE suppliers SET is_active=0 WHERE id=?',(supplier['id'],))
    assert client.get('/api/v1/factory/workspace',headers=auth).status_code==401


def test_login_throttle_and_secret_redaction(setup):
    _,_,client=setup
    for _ in range(5):assert client.post('/api/v1/factory/login',json={'username':'unknown','password':PASSWORD}).status_code==401
    limited=client.post('/api/v1/factory/login',json={'username':'unknown','password':PASSWORD})
    assert limited.status_code==429 and limited.headers['retry-after']=='900'
    response=client.post('/api/v1/admin/factory-accounts',headers=AUTH,json={'password':'sensitive-short'})
    assert response.status_code==422 and 'sensitive-short' not in response.text
    assert client.post('/api/v1/factory/login',content=b'x'*65537).status_code==413


def test_design_sharing_is_explicit_scoped_and_removed_on_delete(factory_setup):
    store,sku,client,supplier,supplier_b,_,tokens=factory_setup
    image_url=f"/api/v1/admin/products/{sku['product_id']}/images"
    design=client.post(image_url,headers=AUTH,json=image_payload()).json()
    model=client.post(image_url,headers=AUTH,json={**image_payload(),'kind':'model'}).json()
    factory_url=f"/api/v1/factory/products/{sku['product_id']}/images"
    assert client.get(factory_url,headers=tokens[0]).json()=={'images':[]}
    assignment_url=f"/api/v1/admin/products/{sku['product_id']}/suppliers"
    sharing={'supplier_ids':[supplier['id']],'shared_images':[{'supplier_id':supplier['id'],'image_ids':[design['id']]}]}
    assert assignment(client,assignment_url,sharing).status_code==200
    assert client.get(factory_url,headers=tokens[0]).json()=={'images':[design]}
    assert client.get(factory_url,headers=tokens[1]).status_code==404
    assert assignment(client,assignment_url,{'supplier_ids':[supplier['id']]}).json()['shared_images'][0]['image_ids']==[design['id']]
    assert assignment(client,assignment_url,{'supplier_ids':[supplier['id']],'shared_images':[{'supplier_id':supplier['id'],'image_ids':[model['id']]}]}).status_code==422
    assert client.delete(image_url+'/'+design['id'],headers=AUTH).status_code==200
    assert client.get(factory_url,headers=tokens[0]).json()=={'images':[]}

FACTORY_TABLES=['product_progress_history','production_history','production_requests','factory_image_shares','product_suppliers','factory_sessions','factory_login_limits','factory_accounts']

def test_v9_migration_preserves_images_catalog_and_rollback(setup):
    store,sku,client=setup
    image=client.post(f"/api/v1/admin/products/{sku['product_id']}/images",headers=AUTH,json=image_payload()).json()
    before=store.get()
    with sqlite3.connect(store.path) as db:
        for table in FACTORY_TABLES:db.execute(f'DROP TABLE {table}')
        db.execute('ALTER TABLE skus DROP COLUMN is_active')
        for table in ('review_history','product_reviews','publication_history','product_publications','shipment_stock_links','shipment_history','shipments'):
            db.execute(f'DROP TABLE IF EXISTS {table}')
        db.execute('PRAGMA user_version=9')
    assert store.get()==before
    with sqlite3.connect(store.path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==16
        assert db.execute('SELECT id FROM product_images').fetchone()[0]==image['id']
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
        for table in FACTORY_TABLES:db.execute(f'DROP TABLE {table}')
        db.execute('CREATE TABLE production_requests (unexpected TEXT)')
        db.execute('ALTER TABLE skus DROP COLUMN is_active')
        for table in ('review_history','product_reviews','publication_history','product_publications','shipment_stock_links','shipment_history','shipments'):
            db.execute(f'DROP TABLE IF EXISTS {table}')
        db.execute('PRAGMA user_version=9')
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as error:store.get()
    assert error.value.status_code==503
    with sqlite3.connect(store.path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==9
        assert db.execute("SELECT name FROM sqlite_master WHERE name='factory_accounts'").fetchall()==[]


def test_accounts_input_duplicate_stale_and_password_preservation(setup):
    store,_,client=setup;supplier=store.create_supplier(SupplierCreate(name='Factory',is_active=True))
    body={'supplier_id':supplier['id'],'username':'Factory.A','display_name':'Factory A','password':PASSWORD,'is_active':True}
    for patch in [{'password':' ' * 12},{'password':'short'},{'password':'a'*129},{'username':'bad username'},{'display_name':'   '}]:
        assert client.post('/api/v1/admin/factory-accounts',headers=AUTH,json={**body,**patch}).status_code==422
    account=client.post('/api/v1/admin/factory-accounts',headers=AUTH,json=body).json()
    assert account['username']=='factory.a'
    assert client.post('/api/v1/admin/factory-accounts',headers=AUTH,json={**body,'username':'factory.a'}).status_code==409
    url=f"/api/v1/admin/factory-accounts/{account['id']}"
    with store.transaction() as db:hashed=db.execute('SELECT password_hash FROM factory_accounts').fetchone()[0]
    assert client.put(url,headers=AUTH,json={'display_name':'New name','is_active':True,'version':0}).status_code==200
    with store.transaction() as db:assert db.execute('SELECT password_hash FROM factory_accounts').fetchone()[0]==hashed
    assert client.put(url,headers=AUTH,json={'display_name':'Stale','is_active':True,'version':0}).status_code==409
    assert client.put(url,headers=AUTH,json={'display_name':'Null','is_active':True,'version':1,'password':None}).status_code==422


def test_login_throttle_expiration_and_client_bucket(setup,monkeypatch):
    store,_,client=setup
    now=int(time.time())
    monkeypatch.setattr('app.factory.time.time',lambda:now)
    for _ in range(5):assert client.post('/api/v1/factory/login',json={'username':'unknown','password':PASSWORD}).status_code==401
    assert client.post('/api/v1/factory/login',json={'username':'unknown','password':PASSWORD}).status_code==429
    monkeypatch.setattr('app.factory.time.time',lambda:now+901)
    assert client.post('/api/v1/factory/login',json={'username':'unknown','password':PASSWORD}).status_code==401
    with store.transaction() as db:
        db.execute('UPDATE factory_login_limits SET failures=30 WHERE bucket=?',(hashlib.sha256(b'client:testclient').hexdigest(),))
    assert client.post('/api/v1/factory/login',json={'username':'another','password':PASSWORD}).status_code==429


def test_concurrent_production_retry_no_duplicate(setup):
    store,sku,client=setup;supplier=store.create_supplier(SupplierCreate(name='Factory',is_active=True))
    assignment(client,f"/api/v1/admin/products/{sku['product_id']}/suppliers",{'supplier_ids':[supplier['id']]})
    factory=FactoryStore(store);body=ProductionCreate(**request_body(sku,supplier))
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:factory.create_request(body),range(2)))
    assert results[0]==results[1]
    with store.transaction() as db:
        assert db.execute('SELECT COUNT(*) FROM production_requests').fetchone()[0]==1
        assert db.execute('SELECT COUNT(*) FROM production_history').fetchone()[0]==1

def test_assignment_share_stale_version_cannot_restore_revoked_access(factory_setup):
    store,sku,client,supplier,_,_,tokens=factory_setup
    url=f"/api/v1/admin/products/{sku['product_id']}/suppliers"
    image=client.post(f"/api/v1/admin/products/{sku['product_id']}/images",headers=AUTH,json=image_payload()).json()
    share={'supplier_ids':[supplier['id']],'shared_images':[{'supplier_id':supplier['id'],'image_ids':[image['id']]}],'version':1}
    first=client.put(url,headers=AUTH,json=share)
    assert first.status_code==200 and first.json()['version']==2
    assert client.put(url,headers=AUTH,json={'supplier_ids':[supplier['id']],'shared_images':[],'version':2}).json()['version']==3
    before=client.get('/api/v1/admin/factory-workspace',headers=AUTH).json()
    assert client.put(url,headers=AUTH,json={**share,'version':2}).status_code==409
    assert client.put(url,headers=AUTH,json={'supplier_ids':[]}).status_code==422
    assert client.get('/api/v1/admin/factory-workspace',headers=AUTH).json()==before
    assert client.get(f"/api/v1/factory/products/{sku['product_id']}/images",headers=tokens[0]).json()=={'images':[]}
