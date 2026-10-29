from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from uuid import uuid4
import sqlite3
import pytest
from fastapi import HTTPException
from test_movement_reasons import setup
from test_factory import factory_setup, AUTH, assignment
from app.shipments import ShipmentStore, ShipmentCreate, Version
from app.inventory import CatalogStore
from option_helpers import sku_body

F='/api/v1/factory/shipments'
A='/api/v1/admin/shipments'
DAY='2026-01-01'

@pytest.fixture(autouse=True)
def fast_hash_for_isolated_tests(monkeypatch):
    # Same hash/verification path; reduce KDF work only within isolated fixtures.
    monkeypatch.setattr('app.factory.PASSWORD_ITERATIONS', 1000)


def sample(sku, **patch):
    return {'id':str(uuid4()),'kind':'sample','product_id':sku['product_id'],'design_revision':'시안 1차',
            'shipped_on':DAY,'lines':[{'color':'Black','size':'M','quantity':3}],**patch}


def ready(client, sku, supplier, extra=None, quantity=5):
    body={'id':str(uuid4()),'product_id':sku['product_id'],'supplier_id':supplier['id'],
          'lines':[{'sku_id':sku['id'],'quantity':quantity}]+([{'sku_id':extra['id'],'quantity':quantity}] if extra else []),'due_date':'','note':''}
    row=client.post('/api/v1/admin/production-requests',headers=AUTH,json=body).json()
    return row


def mark_ready(store, rid):
    with store.transaction() as db:
        db.execute("UPDATE production_requests SET status='ready',version=version+1 WHERE id=?",(rid,))


def dispatch(client, token, sku, rid, quantity=3, extra=None):
    body={'id':str(uuid4()),'kind':'finished','product_id':sku['product_id'],'production_request_id':rid,
          'shipped_on':DAY,'lines':[{'sku_id':sku['id'],'quantity':quantity}]+([{'sku_id':extra['id'],'quantity':quantity}] if extra else [])}
    response=client.post(F,headers=token,json=body)
    assert response.status_code==201,response.text
    return response.json(),body


def receive(client,row,quantity=2):
    return client.put(f"{A}/{row['id']}/receive",headers=AUTH,json={'version':row['version'],'received_on':DAY,
        'lines':[{'line_id':x['id'],'received_quantity':quantity} for x in row['lines']]})


def inspect(client,row,accepted=1,verdict=''):
    body={'version':row['version'],'lines':[{'line_id':x['id'],'accepted_quantity':accepted,'rejected_quantity':x['received_quantity']-accepted} for x in row['lines']]}
    if verdict:body['sample_verdict']=verdict
    return client.put(f"{A}/{row['id']}/inspect",headers=AUTH,json=body)


def test_sample_never_stock_and_historical_scope(factory_setup):
    store,sku,client,supplier,other,accounts,tokens=factory_setup
    before=store.get()
    body=sample(sku)
    response=client.post(F,headers=tokens[0],json=body);assert response.status_code==201,response.text
    row=response.json()
    assert row['kind']=='sample' and row['status']=='dispatched'
    assert 'on_hand' not in response.text
    assert client.post(F,headers=tokens[0],json=body).json()==row
    assert client.post(F,headers=tokens[0],json={**body,'note':'different'}).status_code==409
    assert client.get(f"{F}/{row['id']}",headers=tokens[1]).status_code==404
    assert client.get(F,headers=tokens[1]).json()=={'shipments':[]}
    assert assignment(client,f"/api/v1/admin/products/{sku['product_id']}/suppliers",{'supplier_ids':[other['id']]}).status_code==200
    assert client.get(f"{F}/{row['id']}",headers=tokens[0]).status_code==200
    assert client.post(F,headers=tokens[0],json=sample(sku)).status_code==404
    row=receive(client,row).json();assert row['status']=='received'
    row=inspect(client,row,verdict='approved').json();assert row['status']=='inspected'
    assert client.put(f"{A}/{row['id']}/confirm",headers=AUTH,json={'version':2}).status_code==409
    assert store.get()['skus']==before['skus'] and store.get()['movements']==before['movements']
    assert client.get('/api/v1/admin/inventory/overview',headers=AUTH).json()['total_on_hand']==sum(s['on_hand'] for s in before['skus'])
    assert len(row['history'])==3


def test_finished_receipt_inspection_confirm_once_supplier_deactivation(factory_setup):
    store,sku,client,supplier,_,_,tokens=factory_setup
    req=ready(client,sku,supplier);mark_ready(store,req['id'])
    row,body=dispatch(client,tokens[0],sku,req['id'])
    assert store.get()['skus'][0]['on_hand']==0
    row=receive(client,row).json();assert row['lines'][0]['received_quantity']==2
    row=inspect(client,row).json();assert store.get()['movements']==[]
    assert client.get('/api/v1/admin/inventory/overview',headers=AUTH).json()['total_on_hand']==0
    with store.transaction() as db:
        db.execute("UPDATE suppliers SET is_active=0,name='Renamed' WHERE id=?",(supplier['id'],))
    response=client.put(f"{A}/{row['id']}/confirm",headers=AUTH,json={'version':2});assert response.status_code==200,response.text
    confirmed=response.json();assert confirmed['status']=='confirmed'
    for version in (2,3):
        assert client.put(f"{A}/{row['id']}/confirm",headers=AUTH,json={'version':version}).json()==confirmed
    assert client.put(f"{A}/{row['id']}/confirm",headers=AUTH,json={'version':1}).status_code==409
    data=store.get();assert data['skus'][0]['on_hand']==1 and len(data['movements'])==1
    assert client.get('/api/v1/admin/inventory/overview',headers=AUTH).json()['total_on_hand']==1
    movement=data['movements'][0]
    assert movement['supplier_name']==supplier['name'] and row['id'] in movement['reason']
    assert confirmed['lines'][0]['movement_id']==movement['id']


def test_finished_remaining_and_wrong_sku(factory_setup):
    store,sku,client,supplier,_,_,tokens=factory_setup
    req=ready(client,sku,supplier)
    body={'id':str(uuid4()),'kind':'finished','product_id':sku['product_id'],'production_request_id':req['id'],'shipped_on':DAY,'lines':[{'sku_id':sku['id'],'quantity':3}]}
    assert client.post(F,headers=tokens[0],json=body).status_code==409
    mark_ready(store,req['id'])
    assert client.post(F,headers=tokens[0],json={**body,'lines':[{'sku_id':'missing','quantity':1}]}).status_code==422
    assert client.post(F,headers=tokens[0],json=body).status_code==201
    assert client.post(F,headers=tokens[0],json={**body,'id':str(uuid4())}).status_code==409
    assert client.post(F,headers=tokens[0],json={**body,'id':str(uuid4()),'lines':[{'sku_id':sku['id'],'quantity':2}]}).status_code==201


@pytest.mark.parametrize('patch',[
 {'kind':'other'},{'lines':[]},{'lines':[{'color':'B','size':'S','quantity':True}]},
 {'lines':[{'color':'B','size':'S','quantity':0}]},{'design_revision':''}, {'production_request_id':'unexpected'},
 {'lines':[{'sku_id':'unexpected','color':'B','size':'S','quantity':1}]},
 {'lines':[{'color':'B','size':'S','quantity':1},{'color':'b','size':'s','quantity':2}]},
 {'shipped_on':'wrong'},{'shipped_on':(date.today()+timedelta(days=1)).isoformat()}, {'supplier_id':'other'}])
def test_dispatch_validation(factory_setup,patch):
    _,sku,client,_,_,_,tokens=factory_setup
    assert client.post(F,headers=tokens[0],json=sample(sku,**patch)).status_code==422
    assert client.get(F,headers=tokens[0]).json()=={'shipments':[]}


def test_transition_auth_and_invalid_counts(factory_setup):
    _,sku,client,_,_,_,tokens=factory_setup
    assert client.get(F).status_code==401
    assert client.get(A,headers=tokens[0]).status_code==401
    assert client.post(F,headers=AUTH,json=sample(sku)).status_code==401
    row=client.post(F,headers=tokens[0],json=sample(sku)).json()
    payload={'version':0,'received_on':DAY,'lines':[{'line_id':row['lines'][0]['id'],'received_quantity':2}]}
    for action in ('receive','inspect','confirm'):
        assert client.put(f"{A}/{row['id']}/{action}",headers=tokens[0],json=payload).status_code==401
    assert inspect(client,row,accepted=0,verdict='revision_requested').status_code==409
    for patch in ({'version':1},{'lines':[]},{'received_on':'2025-12-31'},
                  {'lines':[{'line_id':'wrong','received_quantity':1}]},
                  {'lines':payload['lines']*2},
                  {'lines':[{'line_id':row['lines'][0]['id'],'received_quantity':4}]}):
        result=client.put(f"{A}/{row['id']}/receive",headers=AUTH,json={**payload,**patch})
        assert result.status_code in (409,422),result.text
    row=receive(client,row,0).json()
    assert inspect(client,row,accepted=0,verdict='approved').status_code==422
    assert inspect(client,row,accepted=0).status_code==422
    assert inspect(client,row,accepted=0,verdict='revision_requested').status_code==200


def test_multisku_confirm_rollback_and_concurrent_idempotency(factory_setup):
    store,sku,client,supplier,_,_,tokens=factory_setup
    extra=store.create_sku(sku_body(store,sku['product_id'],'L'))
    req=ready(client,sku,supplier,extra);mark_ready(store,req['id'])
    row,_=dispatch(client,tokens[0],sku,req['id'],extra=extra)
    row=receive(client,row).json();row=inspect(client,row).json()
    with store.transaction() as db:db.execute('UPDATE skus SET on_hand=1000000 WHERE id=?',(extra['id'],))
    assert client.put(f"{A}/{row['id']}/confirm",headers=AUTH,json={'version':2}).status_code==409
    assert store.get()['movements']==[]
    assert next(x for x in store.get()['skus'] if x['id']==sku['id'])['on_hand']==0
    assert client.get(f"{A}/{row['id']}",headers=AUTH).json()['status']=='inspected'
    with store.transaction() as db:db.execute('UPDATE skus SET on_hand=0 WHERE id=?',(extra['id'],))
    service=ShipmentStore(store)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:service.confirm(row['id'],Version(version=2)),range(2)))
    assert results[0]==results[1]
    assert len(store.get()['movements'])==2
    assert all(x['on_hand']==1 for x in store.get()['skus'])


def test_v12_migration_backup_preserves_data(setup):
    store,sku,_=setup
    before=store.get()
    with sqlite3.connect(store.path) as db:
        db.execute('DROP TABLE review_history');db.execute('DROP TABLE product_reviews');db.execute('DROP TABLE publication_history');db.execute('DROP TABLE product_publications');db.execute('DROP TABLE shipment_stock_links');db.execute('DROP TABLE shipment_history');db.execute('DROP TABLE shipments')
        db.execute('PRAGMA user_version=12')
    after=CatalogStore(store.path).get()
    assert after==before
    backups=list(store.path.parent.glob(store.path.name+'.pre-v13-*.bak'));assert len(backups)==1
    with sqlite3.connect(backups[0]) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==12
        assert db.execute('SELECT id FROM skus').fetchone()[0]==sku['id']
    with sqlite3.connect(store.path) as db:assert db.execute('PRAGMA user_version').fetchone()[0]==16
