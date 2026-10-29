import pytest
from test_factory import factory_setup, AUTH, setup


def test_product_design_progress(setup, factory_setup):
    store,sku,client,supplier,_,_,tokens=factory_setup
    url=f"/api/v1/admin/products/{sku['product_id']}/progress"
    response=client.get(url,headers=AUTH)
    assert response.status_code==200
    assert response.json()['status']=='not_started'
    assert response.json()['history']==[]


import json
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from fastapi import HTTPException
from app.factory import FactoryStore, ProductProgressUpdate
from app.inventory import SupplierCreate
from test_factory import assignment, request_body


def test_progress_roles_rework_notes_stale_and_no_stock_effects(factory_setup):
    store,sku,client,supplier,_,accounts,tokens=factory_setup
    pid=sku['product_id'];admin_url=f'/api/v1/admin/products/{pid}/progress';factory_url=f'/api/v1/factory/products/{pid}/progress'
    before=store.get();created=client.post('/api/v1/admin/production-requests',headers=AUTH,json=request_body(sku,supplier)).json()
    assert client.get(admin_url,headers=tokens[0]).status_code==401
    assert client.get(factory_url,headers=AUTH).status_code==401
    assert client.get(factory_url,headers=tokens[1]).status_code==404
    assert client.put(factory_url,headers=tokens[1],json={'status':'design_review','version':1}).status_code==404
    statuses=['design_review','sample_in_progress','design_complete','design_review']
    for index,status in enumerate(statuses):
        url,headers=(factory_url,tokens[0]) if index%2 else (admin_url,AUTH)
        response=client.put(url,headers=headers,json={'status':status,'version':index+1,'note':f'Report {index}'})
        assert response.status_code==200
        result=response.json();assert result['status']==status and result['version']==index+2
        assert result['history'][-1]['actor']==(accounts[0]['id'] if index%2 else 'local-admin')
        assert result['history'][-1]['supplier_name']==supplier['name'] and result['updated_at']
    last=client.get(admin_url,headers=AUTH).json()
    assert client.put(admin_url,headers=AUTH,json={'status':'design_complete','version':1}).status_code==409
    assert client.get(admin_url,headers=AUTH).json()==last
    assert client.get('/api/v1/admin/factory-workspace',headers=AUTH).json()['requests']==[created]
    after=store.get();assert after['skus']==before['skus'] and after['movements']==before['movements']
    assert client.get('/api/v1/admin/factory-workspace',headers=AUTH).json()['assignments'][0]['progress_status']=='design_review'
    assert client.get('/api/v1/factory/workspace',headers=tokens[0]).json()['products'][0]['progress_status']=='design_review'


def test_progress_noop_and_note_report(factory_setup):
    store,sku,client,_,_,_,tokens=factory_setup
    url=f"/api/v1/admin/products/{sku['product_id']}/progress"
    before=client.get(url,headers=AUTH).json()
    response=client.put(url,headers=AUTH,json={'status':'not_started','version':before['version'],'note':'   '})
    assert response.status_code==200 and response.json()==before
    report=client.put(url,headers=AUTH,json={'status':'not_started','version':before['version'],'note':' Waiting for reference '}).json()
    assert report['version']==before['version']+1 and report['history'][0]['note']=='Waiting for reference'
    assert client.put(url,headers=AUTH,json={'status':'not_started','version':before['version']}).status_code==409


def test_assignment_generation_history_isolation_and_preservation(factory_setup):
    store,sku,client,supplier,supplier_b,_,tokens=factory_setup
    pid=sku['product_id'];admin_url=f'/api/v1/admin/products/{pid}/progress';factory_url=f'/api/v1/factory/products/{pid}/progress';assign_url=f'/api/v1/admin/products/{pid}/suppliers'
    client.put(factory_url,headers=tokens[0],json={'status':'sample_in_progress','version':1,'note':'Factory A private shared note'})
    with store.transaction() as db:old_generation=db.execute('SELECT assignment_id FROM product_suppliers WHERE product_id=?',(pid,)).fetchone()[0]
    assignment(client,assign_url,{'supplier_ids':[supplier['id']],'shared_images':[]})
    assert client.get(admin_url,headers=AUTH).json()['status']=='sample_in_progress'
    with store.transaction() as db:assert db.execute('SELECT assignment_id FROM product_suppliers WHERE product_id=?',(pid,)).fetchone()[0]==old_generation
    assignment(client,assign_url,{'supplier_ids':[supplier_b['id']]})
    b=client.get(factory_url,headers=tokens[1]).json()
    assert b['status']=='not_started' and b['history']==[] and b['updated_at']==''
    assert client.get(factory_url,headers=tokens[0]).status_code==404
    assert client.put(factory_url,headers=tokens[1],json={'status':'design_review','version':b['version'],'note':'Factory B shared note'}).status_code==200
    assignment(client,assign_url,{'supplier_ids':[supplier['id']]})
    a=client.get(factory_url,headers=tokens[0]).json()
    assert a['status']=='not_started' and a['history']==[]
    internal=client.get(admin_url,headers=AUTH).json()
    assert len(internal['history'])==2
    assert [event['supplier_id'] for event in internal['history']]==[supplier['id'],supplier_b['id']]
    assignment(client,assign_url,{'supplier_ids':[]})
    unassigned=client.get(admin_url,headers=AUTH)
    assert unassigned.status_code==200
    assert unassigned.json()['supplier_id']==unassigned.json()['supplier_name']==''
    assert unassigned.json()['status']=='not_started' and len(unassigned.json()['history'])==2
    assert client.get(factory_url,headers=tokens[0]).status_code==404
    assert client.get(factory_url,headers=tokens[1]).status_code==404
    assert client.put(admin_url,headers=AUTH,json={'status':'design_review','version':unassigned.json()['version']}).status_code==404
    with store.transaction() as db:assert db.execute('SELECT COUNT(*) FROM product_progress_history').fetchone()[0]==2


@pytest.mark.parametrize('body',[{'status':'approved','version':0},{'status':'not_started','version':True},{'status':'design_review'},{'status':'design_review','version':0,'note':'a'*1001},{'status':'design_review','version':0,'note':None}])
def test_progress_invalid_inputs(setup,body):
    _,sku,client=setup
    assert client.put(f"/api/v1/admin/products/{sku['product_id']}/progress",headers=AUTH,json=body).status_code==422


def test_progress_missing_assignment_and_auth(setup):
    _,sku,client=setup
    for pid in [sku['product_id'],'missing']:
        url=f'/api/v1/admin/products/{pid}/progress'
        assert client.get(url).status_code==401
        assert client.get(url,headers=AUTH).status_code==(200 if pid==sku['product_id'] else 404)
        assert client.put(url,headers=AUTH,json={'status':'design_review','version':0}).status_code==404


def test_concurrent_progress_only_one_commits(setup):
    store,sku,client=setup;supplier=store.create_supplier(SupplierCreate(name='Factory',is_active=True))
    assignment(client,f"/api/v1/admin/products/{sku['product_id']}/suppliers",{'supplier_ids':[supplier['id']]})
    service=FactoryStore(store)
    def update(status):
        try:return service.update_progress(sku['product_id'],ProductProgressUpdate(status=status,version=1))
        except HTTPException as error:return error.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(update,['design_review','sample_in_progress']))
    assert sum(isinstance(result,dict) for result in results)==1 and 409 in results
    with store.transaction() as db:assert db.execute('SELECT COUNT(*) FROM product_progress_history').fetchone()[0]==1


def test_schema10_progress_migration_preserves_rows_and_no_fake_history(setup):
    store,sku,client=setup;supplier=store.create_supplier(SupplierCreate(name='Factory',is_active=True))
    assignment(client,f"/api/v1/admin/products/{sku['product_id']}/suppliers",{'supplier_ids':[supplier['id']]})
    before=store.get()
    with sqlite3.connect(store.path) as db:
        db.execute('DROP TABLE product_progress_history')
        db.execute('DROP INDEX product_suppliers_generation')
        db.execute('ALTER TABLE product_suppliers DROP COLUMN assignment_id')
        db.execute('ALTER TABLE product_suppliers DROP COLUMN progress_status')
        db.execute('ALTER TABLE product_suppliers DROP COLUMN progress_updated_at')
        old_assignment=db.execute('SELECT * FROM product_suppliers').fetchall()
        db.execute('ALTER TABLE skus DROP COLUMN is_active')
        for table in ('review_history','product_reviews','publication_history','product_publications','shipment_stock_links','shipment_history','shipments'):
            db.execute(f'DROP TABLE IF EXISTS {table}')
        db.execute('PRAGMA user_version=10')
    assert store.get()==before
    with sqlite3.connect(store.path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==16
        assert db.execute('SELECT product_id,supplier_id FROM product_suppliers').fetchall()==old_assignment
        row=db.execute('SELECT assignment_id,progress_status,progress_updated_at FROM product_suppliers').fetchone()
        assert row[0] and row[1:] == ('not_started','')
        assert db.execute('SELECT COUNT(*) FROM product_progress_history').fetchone()[0]==0
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]


def test_schema10_progress_migration_rolls_back_on_conflict(setup):
    store,_,_=setup
    with sqlite3.connect(store.path) as db:
        db.execute('DROP TABLE product_progress_history')
        db.execute('DROP INDEX product_suppliers_generation')
        for column in ['assignment_id','progress_status','progress_updated_at']:db.execute(f'ALTER TABLE product_suppliers DROP COLUMN {column}')
        db.execute('CREATE TABLE product_progress_history (unexpected TEXT)')
        db.execute('ALTER TABLE skus DROP COLUMN is_active')
        for table in ('review_history','product_reviews','publication_history','product_publications','shipment_stock_links','shipment_history','shipments'):
            db.execute(f'DROP TABLE IF EXISTS {table}')
        db.execute('PRAGMA user_version=10')
    with pytest.raises(HTTPException) as error:store.get()
    assert error.value.status_code==503
    with sqlite3.connect(store.path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==10
        assert [r[1] for r in db.execute('PRAGMA table_info(product_suppliers)')]==['product_id','supplier_id']
