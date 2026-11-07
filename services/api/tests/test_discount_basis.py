import pytest
from test_inventory import setup, AUTH, BASE
from test_public_catalog import prepared
from test_discount import save


def test_percent_basis_preserves_rate_and_switches_to_price(setup):
    client,_,_=setup;pid,_,_=prepared(client)
    r=save(client,pid,price=30001,discount_mode='percent',discount_percent=20)
    assert r.status_code==200,r.text
    assert r.json()['discount_price']==24000
    assert r.json()['discount_percent']==20
    r=save(client,pid,1,price=40001)
    assert r.json()['discount_price']==32000
    assert r.json()['history'][0]['discount_mode']=='percent'
    r=save(client,pid,2,price=40001,discount_price=25000)
    assert r.json()['discount_mode']=='price'
    assert r.json()['discount_percent'] is None
    assert save(client,pid,3,price=50000).json()['discount_price']==25000
    r=save(client,pid,4,discount_price=None)
    assert r.json()['discount_price'] is None
    assert r.json()['discount_mode']=='price'

@pytest.mark.parametrize('patch',[
    {'discount_percent':0},{'discount_percent':101},{'discount_percent':1.5},
    {'discount_percent':'20'},{'discount_percent':True},{'discount_percent':None},
    {'price':None},{'price':0},{'discount_price':123},
    {'discount_mode':'price','discount_percent':20},
])
def test_invalid_percent_is_atomic(setup,patch):
    client,_,_=setup;pid,_,_=prepared(client)
    before=client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()
    values={'discount_mode':'percent','discount_percent':20,**patch}
    assert save(client,pid,**values).status_code==422
    assert client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()==before

@pytest.mark.parametrize('price,percent,expected',[(1,1,0),(3,33,2),(30000,20,24000),(1000000000,1,990000000),(100,100,0)])
def test_percent_boundaries(setup,price,percent,expected):
    client,_,_=setup;pid,_,_=prepared(client)
    r=save(client,pid,price=price,discount_mode='percent',discount_percent=percent)
    assert r.status_code==200,r.text
    assert r.json()['effective_price']==expected
    assert client.get('/api/v1/products/'+pid).json()['effective_price']==expected
    assert save(client,pid,0,price=price,discount_mode='percent',discount_percent=percent).status_code==409

def test_v17_migration_preserves_legacy_price_and_backup(setup):
    import sqlite3
    client,path,_=setup;pid,_,_=prepared(client)
    assert save(client,pid,price=30000,discount_price=24000).status_code==200
    with sqlite3.connect(path) as db:
        for table in ('product_publications','publication_history'):
            db.execute(f'ALTER TABLE {table} DROP COLUMN discount_percent')
            db.execute(f'ALTER TABLE {table} DROP COLUMN discount_mode')
        db.execute('PRAGMA user_version=17')
    r=client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()
    assert r['discount_price']==24000 and r['discount_mode']=='price' and r['discount_percent'] is None
    assert r['history'][0]['discount_mode']=='price'
    backups=list(path.parent.glob(path.name+'.pre-v18-*.bak'));assert len(backups)==1
    with sqlite3.connect(backups[0]) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==17
        assert db.execute('SELECT discount_price FROM product_publications WHERE product_id=?',(pid,)).fetchone()[0]==24000
    assert client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()==r
    assert len(list(path.parent.glob(path.name+'.pre-v18-*.bak')))==1


def test_percent_requires_admin(setup):
    client,_,_=setup;pid,_,_=prepared(client)
    for headers in [{},{'Authorization':'Bearer factory'},{'Authorization':'Bearer customer'}]:
        assert client.put(BASE+f'/products/{pid}/publication',headers=headers,json={'status':'draft','price':30000,'discount_mode':'percent','discount_percent':20,'version':0}).status_code==401
