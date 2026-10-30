from uuid import uuid4
import pytest
from test_customer import customer, login, P
from test_public_catalog import prepared, publish
from test_inventory import AUTH, BASE

SHIP = {'recipient':'테스트 고객','phone':'01000000000','postal_code':'04524','address':'서울특별시 테스트로 10','address_detail':'테스트','memo':''}

def setup_checkout(customer):
    c,_,_,_=customer
    auth=login(c)
    pid,sku,_=prepared(c)
    assert publish(c,pid).status_code==200
    body={'source':'direct','sku_id':sku['id'],'quantity':1,'request_id':str(uuid4())}
    return c,auth,pid,sku,body

def test_checkout_owner_retry_and_payment_gate(customer):
    c,auth,pid,sku,body=setup_checkout(customer)
    url=P+'/checkouts'
    assert c.post(url,json=body).status_code==401
    r=c.post(url,headers=auth,json=body); assert r.status_code==200,r.text
    d=r.json(); detail=url+'/'+d['id']
    assert d['total']==12000 and d['payment_enabled'] is False
    assert c.post(url,headers=auth,json=body).json()['id']==d['id']
    assert c.post(url,headers=auth,json=body|{'quantity':2}).status_code==409
    other=login(c,'kakao')
    assert c.get(detail,headers=other).status_code==404
    assert c.get(url,headers=other).json()['checkouts']==[]
    save={'version':0,'request_id':str(uuid4()),'shipping':SHIP}
    assert c.put(detail,headers=other,json=save).status_code==404
    saved=c.put(detail,headers=auth,json=save); assert saved.status_code==200,saved.text
    assert saved.json()['version']==1 and saved.json()['shipping_fee']==3000
    assert saved.json()['delivery_status']=='verification_required' and saved.json()['grand_total'] is None
    assert c.put(detail,headers=auth,json=save).json()['version']==1
    assert c.put(detail,headers=auth,json=save|{'request_id':str(uuid4())}).status_code==409
    assert c.post(detail+'/payment',headers=auth,json={}).status_code==503
    assert c.post(detail+'/payment',headers=other,json={}).status_code==404
    assert c.get(BASE+'/catalog',headers=AUTH).json()['skus'][0]['on_hand']==4

@pytest.mark.parametrize('price,fee',[(49999,3000),(50000,0),(50001,0)])
def test_checkout_shipping_boundaries_and_repricing(customer,price,fee):
    c,auth,pid,sku,body=setup_checkout(customer)
    assert publish(c,pid,1,price=price).status_code==200
    d=c.post(P+'/checkouts',headers=auth,json=body).json()
    url=P+'/checkouts/'+d['id']
    d=c.put(url,headers=auth,json={'version':0,'request_id':str(uuid4()),'shipping':SHIP}).json()
    assert d['shipping_fee']==fee and d['total']==price
    assert publish(c,pid,2,price=10000).status_code==200
    assert c.get(url,headers=auth).json()['total']==10000
    assert publish(c,pid,3,'paused').status_code==200
    assert c.get(url,headers=auth).json()['has_unavailable']

def test_checkout_invalid_cart_and_restricted_region(customer):
    c,auth,pid,sku,body=setup_checkout(customer)
    url=P+'/checkouts'
    assert c.post(url,headers=auth,json={'source':'cart','cart_version':0,'request_id':str(uuid4())}).status_code==409
    assert c.post(url,headers=auth,json=body|{'quantity':True}).status_code==422
    assert c.post(url,headers=auth,json=body|{'quantity':5}).status_code==409
    assert c.post(url,headers=auth,json=body|{'customer_id':'other'}).status_code==422
    c.put(P+'/cart/items/'+sku['id'],headers=auth,json={'version':0,'quantity':2,'request_id':str(uuid4())})
    cart={'source':'cart','cart_version':1,'request_id':str(uuid4())}
    d=c.post(url,headers=auth,json=cart).json()
    assert d['item_count']==2
    url+='/'+d['id']
    save={'version':0,'request_id':str(uuid4()),'shipping':SHIP|{'postal_code':'63000','address':'제주특별자치도 테스트로 1'}}
    r=c.put(url,headers=auth,json=save); assert r.status_code==200,r.text
    assert r.json()['delivery_status']=='restricted' and r.json()['shipping_fee'] is None
    assert c.put(url,headers=auth,json=save|{'shipping':SHIP|{'recipient':'   '}}).status_code==422

def test_discount_basis_and_concurrent_save(customer):
    from concurrent.futures import ThreadPoolExecutor
    c,auth,pid,sku,body=setup_checkout(customer)
    r=c.put(BASE+'/products/'+pid+'/publication',headers=AUTH,json={'status':'published','price':60000,'discount_price':49999,'version':1})
    assert r.status_code==200,r.text
    d=c.post(P+'/checkouts',headers=auth,json=body).json()
    url=P+'/checkouts/'+d['id']
    def save(_):
        return c.put(url,headers=auth,json={'version':0,'request_id':str(uuid4()),'shipping':SHIP}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(save,range(2)))==[200,409]
    saved=c.get(url,headers=auth).json()
    assert saved['total']==49999 and saved['shipping_fee']==3000 and saved['version']==1
