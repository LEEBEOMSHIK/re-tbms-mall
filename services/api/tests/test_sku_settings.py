import sqlite3
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import pytest
from test_movement_reasons import setup
from test_factory import factory_setup
AUTH={'Authorization':'Bearer reason-test-only'}


def test_settings_disable_stock_reenable_and_legacy_threshold(setup):
    store,sku,client=setup
    url=f"/api/v1/admin/skus/{sku['id']}/settings"
    before=store.get()
    response=client.put(url,headers=AUTH,json={'is_active':False,'reorder_point':1000000,'version':0})
    assert response.status_code==200
    disabled=response.json()
    assert disabled=={**sku,'is_active':False,'reorder_point':1000000,'version':1}
    after=store.get()
    assert after['products'][0]['publication_can_publish'] is False
    for data in (before,after):
        data['products']=[{k:v for k,v in p.items() if not k.startswith('publication_')} for p in data['products']]
    assert after=={**before,'skus':[disabled]}
    legacy=client.put(f"/api/v1/admin/skus/{sku['id']}/reorder-point",headers=AUTH,json={'reorder_point':0,'version':1})
    assert legacy.status_code==200 and legacy.json()['is_active'] is False
    movement=client.post('/api/v1/admin/inventory/movements',headers=AUTH,json={'sku_id':sku['id'],'delta':5,'reason_code':'receipt','version':2,'request_id':str(uuid4())})
    assert movement.status_code==200
    assert client.post('/api/v1/admin/inventory/movements',headers=AUTH,json={'sku_id':sku['id'],'delta':-1,'reason_code':'sale','version':3,'request_id':str(uuid4())}).status_code==200
    before_reenable=store.get()
    response=client.put(url,headers=AUTH,json={'is_active':True,'reorder_point':4,'version':4})
    assert response.status_code==200
    assert response.json()['is_active'] is True and response.json()['on_hand']==4
    assert store.get()['movements']==before_reenable['movements']
    assert client.put(url,headers=AUTH,json={'is_active':False,'reorder_point':0,'version':3}).status_code==409

@pytest.mark.parametrize('patch',[{'is_active':0},{'is_active':'false'},{'is_active':None},{'reorder_point':True},{'reorder_point':-1},{'reorder_point':1000001},{'version':True},{'version':-1},{'on_hand':100}])
def test_settings_invalid_no_mutation(setup,patch):
    store,sku,client=setup;before=store.get()
    assert client.put(f"/api/v1/admin/skus/{sku['id']}/settings",headers=AUTH,json={'is_active':False,'reorder_point':3,'version':0,**patch}).status_code==422
    assert store.get()==before


def test_settings_auth_factory_denial_and_missing(factory_setup):
    store,sku,client,_,_,_,tokens=factory_setup
    url=f"/api/v1/admin/skus/{sku['id']}/settings";body={'is_active':False,'reorder_point':2,'version':0};before=store.get()
    assert client.put(url,json=body).status_code==401
    assert client.put(url,headers=tokens[0],json=body).status_code==401
    assert client.put('/api/v1/admin/skus/missing/settings',headers=AUTH,json=body).status_code==404
    assert store.get()==before


def test_settings_concurrent_cas(setup):
    store,sku,client=setup
    def save(active):return client.put(f"/api/v1/admin/skus/{sku['id']}/settings",headers=AUTH,json={'is_active':active,'reorder_point':2,'version':0}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:assert sorted(pool.map(save,[True,False]))==[200,409]
    assert store.get()['skus'][0]['version']==1 and store.get()['movements']==[]


def test_schema11_migration_preserves_values_and_activates_existing(setup):
    store,sku,_=setup
    before=store.get()
    with sqlite3.connect(store.path) as db:
        db.execute('ALTER TABLE skus DROP COLUMN is_active')
        for table in ('review_history','product_reviews','publication_history','product_publications','shipment_stock_links','shipment_history','shipments'):
            db.execute(f'DROP TABLE IF EXISTS {table}')
        db.execute('ALTER TABLE products DROP COLUMN details')
        db.execute('PRAGMA user_version=11')
        old=db.execute('SELECT * FROM skus').fetchall()
    assert store.get()==before
    with sqlite3.connect(store.path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==17
        rows=db.execute('SELECT * FROM skus').fetchall()
        assert [r[:-1] for r in rows]==old and all(r[-1]==1 for r in rows)
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]


def test_existing_inactive_batch_is_not_reactivated(setup):
    store,sku,client=setup
    client.put(f"/api/v1/admin/skus/{sku['id']}/settings",headers=AUTH,json={'is_active':False,'reorder_point':4,'version':0})
    expected=store.get()['skus'][0]
    for path,body in [('/api/v1/admin/skus/batch',{'product_id':sku['product_id'],'color_ids':[sku['color_id']],'size_ids':[sku['size_id']],'reorder_point':2}),('/api/v1/admin/skus/selected-batch',{'product_id':sku['product_id'],'items':[{'color_id':sku['color_id'],'size_id':sku['size_id'],'initial_stock':3,'reorder_point':2}]})]:
        response=client.post(path,headers=AUTH,json=body)
        assert response.status_code==200
        assert response.json()=={'created':[],'existing':[expected]}
        assert response.json()['existing'][0]['is_active'] is False
    assert store.get()['skus'][0]==expected and store.get()['movements']==[]


def test_schema11_column_conflict_rolls_back(setup):
    store,_,_=setup
    with sqlite3.connect(store.path) as db:db.execute('PRAGMA user_version=11')
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as error:store.get()
    assert error.value.status_code==503
    with sqlite3.connect(store.path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==11
        assert db.execute('SELECT is_active FROM skus').fetchone()[0]==1
