import sqlite3
import pytest
from test_inventory import setup, AUTH, BASE, snapshot
from test_public_catalog import prepared


def save(client,pid,version=0,**values):
    return client.put(BASE+f'/products/{pid}/publication',headers=AUTH,json={'status':'published','price':10000,'version':version,**values})


def values(row): return [row[key] for key in ('price','discount_price','effective_price','discount_rate')]


def test_discount_contract_history_public_and_legacy_omission(setup):
    client,_,_=setup;pid,_,_=prepared(client)
    first=save(client,pid,discount_price=7500);assert first.status_code==200,first.text
    assert values(first.json())==[10000,7500,7500,25]
    assert values(first.json()['history'][0])==[10000,7500,7500,25]
    for data in [client.get('/api/v1/products/'+pid).json(),client.get('/api/v1/products').json()['products'][0],client.get('/api/v1/storefront').json()['products'][0]]:
        assert values(data)==[10000,7500,7500,25]
    omitted=save(client,pid,1,price=12000);assert omitted.status_code==200
    assert values(omitted.json())==[12000,7500,7500,37]
    cleared=save(client,pid,2,price=12000,discount_price=None);assert cleared.status_code==200
    assert values(cleared.json())==[12000,None,12000,None]
    assert [values(h) for h in cleared.json()['history']]==[[12000,None,12000,None],[12000,7500,7500,37],[10000,7500,7500,25]]


@pytest.mark.parametrize('price,discount,expected',[(None,None,[None,None,None,None]),(0,None,[0,None,0,None]),(1,0,[1,0,0,100]),(3,1,[3,1,1,66]),(1000000000,999999999,[1000000000,999999999,999999999,0]),(1000000000,None,[1000000000,None,1000000000,None])])
def test_discount_zero_null_rounding_and_upper_boundary(setup,price,discount,expected):
    client,_,_=setup;pid,_,_=prepared(client)
    response=save(client,pid,price=price,discount_price=discount);assert response.status_code==200,response.text
    assert values(response.json())==expected
    assert values(client.get('/api/v1/products/'+pid).json())==expected


@pytest.mark.parametrize('patch',[{'price':None,'discount_price':0},{'price':0,'discount_price':0},{'price':100,'discount_price':100},{'price':100,'discount_price':101},{'discount_price':True},{'discount_price':1.5},{'discount_price':'1'},{'discount_price':-1},{'discount_price':1000000001},{'price':True},{'price':1.5},{'price':-1},{'effective_price':1},{'discount_rate':99}])
def test_invalid_discount_never_changes_state(setup,patch):
    client,_,_=setup;pid,_,_=prepared(client)
    before=client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()
    assert save(client,pid,**patch).status_code==422
    assert client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()==before


def test_reduced_base_price_checks_preserved_discount_and_conflict(setup):
    client,_,_=setup;pid,_,_=prepared(client)
    assert save(client,pid,discount_price=8000).status_code==200
    before=client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()
    for price in [None,0,7000,8000]: assert save(client,pid,1,price=price).status_code==422
    assert save(client,pid,0,price=15000,discount_price=1000).status_code==409
    assert client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()==before
    assert save(client,pid,1,price=7000,discount_price=None).status_code==200


def test_discount_write_auth(setup):
    client,_,_=setup;pid,_,_=prepared(client)
    body={'status':'published','price':100,'discount_price':50,'version':0}
    for headers in [{},{'Authorization':'Bearer factory'},{'Authorization':'Bearer customer'}]:
        assert client.put(BASE+f'/products/{pid}/publication',headers=headers,json=body).status_code==401


def test_schema15_additive_discount_preserves_prices_history_and_inventory(setup):
    client,path,_=setup;pid,_,_=prepared(client)
    assert save(client,pid,price=12345).status_code==200
    before=snapshot(client)
    with sqlite3.connect(path) as db:
        db.execute('ALTER TABLE product_publications DROP COLUMN discount_price')
        db.execute('ALTER TABLE publication_history DROP COLUMN discount_price')
        db.execute('PRAGMA user_version=15')
        publication_before=db.execute('SELECT * FROM product_publications').fetchall()
        history_before=db.execute('SELECT * FROM publication_history').fetchall()
    after=client.get(BASE+f'/products/{pid}/publication',headers=AUTH).json()
    assert values(after)==[12345,None,12345,None]
    assert values(after['history'][0])==[12345,None,12345,None]
    assert snapshot(client)==before
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0]==16
        assert [r[:-1] for r in db.execute('SELECT * FROM product_publications')]==publication_before
        assert [r[:-1] for r in db.execute('SELECT * FROM publication_history')]==history_before
    backups=list(path.parent.glob(path.name+'.pre-v16-*.bak'));assert backups
    with sqlite3.connect(backups[0]) as db: assert db.execute('PRAGMA user_version').fetchone()[0]==15
