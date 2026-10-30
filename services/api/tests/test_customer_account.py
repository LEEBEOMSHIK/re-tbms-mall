from uuid import uuid4
from test_customer import customer, login, P
from test_checkout import SHIP, setup_checkout
import pytest

def mutation(version=0, **fields):
    return {'version':version,'request_id':str(uuid4()),**fields}

def test_checkout_default_and_alternate_delivery_are_independent_snapshots(customer):
    c,a,_,_,body=setup_checkout(customer)
    second=SHIP|{'recipient':'다른 수령인','phone':'01011112222','postal_code':'06236','address':'서울특별시 합성로 20','address_detail':'3층','memo':'문 앞'}
    first=c.post(P+'/addresses',headers=a,json=mutation(label='기본',shipping=SHIP)).json()['addresses'][0]
    result=c.post(P+'/addresses',headers=a,json=mutation(1,label='다른 배송지',shipping=second)).json()
    other=next(x for x in result['addresses'] if x['id']!=first['id'])
    draft=c.post(P+'/checkouts',headers=a,json=body).json()
    assert draft['shipping']==SHIP
    url=P+'/checkouts/'+draft['id']
    saved=c.put(url,headers=a,json=mutation(shipping=second)).json()
    assert saved['shipping']==second
    assert c.get(url,headers=a).json()['shipping']==second
    assert c.get(P+'/account',headers=a).json()==result
    newer=c.post(P+'/checkouts',headers=a,json=body|{'request_id':str(uuid4())}).json()
    assert newer['shipping']==SHIP
    changed=c.put(P+'/addresses/'+other['id'],headers=a,json=mutation(2,label='다른 배송지',shipping=second|{'address_detail':'4층'},is_default=True))
    assert changed.status_code==200
    assert c.get(url,headers=a).json()['shipping']==second
    assert c.get(P+'/checkouts/'+newer['id'],headers=a).json()['shipping']==SHIP
    latest=c.post(P+'/checkouts',headers=a,json=body|{'request_id':str(uuid4())}).json()
    assert latest['shipping']==second|{'address_detail':'4층'}

@pytest.mark.parametrize('detail',[None,'','   ','x'*101])
def test_required_detail_rejects_address_create_update_and_checkout_without_writes(customer,detail):
    c,a,_,_,body=setup_checkout(customer)
    invalid=SHIP.copy()
    if detail is None:
        del invalid['address_detail']
    else:
        invalid['address_detail']=detail
    before=c.get(P+'/account',headers=a).json()
    assert c.post(P+'/addresses',headers=a,json=mutation(label='집',shipping=invalid)).status_code==422
    assert c.get(P+'/account',headers=a).json()==before
    created=c.post(P+'/addresses',headers=a,json=mutation(label='집',shipping=SHIP)).json()
    identifier=created['addresses'][0]['id']
    assert c.put(P+'/addresses/'+identifier,headers=a,json=mutation(1,label='집',shipping=invalid)).status_code==422
    assert c.get(P+'/account',headers=a).json()==created
    draft=c.post(P+'/checkouts',headers=a,json=body).json()
    url=P+'/checkouts/'+draft['id']
    assert c.put(url,headers=a,json=mutation(shipping=invalid,save_address=True)).status_code==422
    assert c.get(url,headers=a).json()==draft
    assert c.get(P+'/account',headers=a).json()==created
    valid=SHIP|{'address_detail':' 101동 202호 '}
    saved=c.put(url,headers=a,json=mutation(shipping=valid)).json()
    assert saved['shipping']['address_detail']=='101동 202호'

def test_account_ownership_versions_defaults_and_deletion(customer):
    c,_,_,_=customer
    a=login(c); b=login(c,'kakao'); url=P+'/account'
    assert c.get(url).status_code==401
    assert c.get(url,headers=a).json()=={'version':0,'profile':{'name':'','phone':''},'addresses':[]}
    profile=mutation(name='테스트',phone='01000000000')
    r=c.put(url,headers=a,json=profile); assert r.status_code==200,r.text
    assert c.put(url,headers=a,json=profile).json()['version']==1
    assert c.put(url,headers=a,json=profile|{'name':'다름'}).status_code==409
    assert c.get(url,headers=b).json()['profile']['name']==''
    address=mutation(1,label='집',shipping=SHIP,is_default=False)
    r=c.post(P+'/addresses',headers=a,json=address); assert r.status_code==200,r.text
    first=r.json()['addresses'][0]; assert first['is_default']
    assert c.post(P+'/addresses',headers=a,json=address).json()['version']==2
    r=c.post(P+'/addresses',headers=a,json=mutation(2,label='회사',shipping=SHIP|{'address':'서울특별시 회사로 20'},is_default=True))
    assert r.status_code==200,r.text
    data=r.json(); assert sum(x['is_default'] for x in data['addresses'])==1
    second=next(x for x in data['addresses'] if x['id']!=first['id'])
    target=P+'/addresses/'+second['id']
    assert c.request('DELETE',target,headers=b,json=mutation()).status_code==404
    assert c.put(target,headers=b,json=mutation(label='탈취',shipping=SHIP,is_default=True)).status_code==404
    assert c.put(url,headers=a,json=mutation(name='',phone='')).status_code==409
    delete=mutation(3)
    assert c.request('DELETE',target,headers=a,json=delete).status_code==200
    assert c.request('DELETE',target,headers=a,json=delete).status_code==200
    assert not any(x['is_default'] for x in c.get(url,headers=a).json()['addresses'])

def test_default_copy_checkout_opt_in_and_snapshot_isolation(customer):
    c,a,_,_,body=setup_checkout(customer)
    addr=c.post(P+'/addresses',headers=a,json=mutation(label='집',shipping=SHIP,is_default=True))
    assert addr.status_code==200,addr.text
    entry=addr.json()['addresses'][0]
    d=c.post(P+'/checkouts',headers=a,json=body).json()
    assert d['shipping']==SHIP
    update=mutation(1,label='이사',shipping=SHIP|{'address':'서울특별시 이사로 30'},is_default=True)
    assert c.put(P+'/addresses/'+entry['id'],headers=a,json=update).status_code==200
    assert c.get(P+'/checkouts/'+d['id'],headers=a).json()['shipping']==SHIP
    save=mutation(shipping=SHIP|{'recipient':'선물 수령인'},save_address=True)
    r=c.put(P+'/checkouts/'+d['id'],headers=a,json=save); assert r.status_code==200,r.text
    assert c.put(P+'/checkouts/'+d['id'],headers=a,json=save).status_code==200
    account=c.get(P+'/account',headers=a).json()
    assert len(account['addresses'])==2 and account['version']==3
    assert next(x for x in account['addresses'] if x['is_default'])['label']=='이사'

def test_profile_validation_and_parallel_writes(customer):
    from concurrent.futures import ThreadPoolExecutor
    c,_,_,_=customer; a=login(c)
    for fields in [{'name':'x','phone':'bad'},{'name':'x'*51,'phone':''},{'name':'x\n','phone':''},{'name':'x','phone':'','customer_id':'other'}]:
        assert c.put(P+'/account',headers=a,json=mutation(**fields)).status_code==422
    def write(i):
        return c.put(P+'/account',headers=a,json=mutation(name=str(i),phone='')).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(write,range(2)))==[200,409]

def test_address_limit_opt_out_and_clear_contact(customer):
    c,a,_,_,body=setup_checkout(customer)
    for i in range(20):
        r=c.post(P+'/addresses',headers=a,json=mutation(i,label=str(i),shipping=SHIP,is_default=i==19))
        assert r.status_code==200,r.text
    assert c.post(P+'/addresses',headers=a,json=mutation(20,label='초과',shipping=SHIP,is_default=True)).status_code==422
    d=c.post(P+'/checkouts',headers=a,json=body).json()
    url=P+'/checkouts/'+d['id']
    save=mutation(shipping=SHIP|{'recipient':'다른 수령인'})
    assert c.put(url,headers=a,json=save).status_code==200
    assert len(c.get(P+'/account',headers=a).json()['addresses'])==20
    failed=c.put(url,headers=a,json=mutation(1,shipping=SHIP|{'recipient':'용량초과'},save_address=True))
    assert failed.status_code==422
    assert c.get(url,headers=a).json()['shipping']['recipient']=='다른 수령인'
    assert c.get(url,headers=a).json()['version']==1
    assert c.put(P+'/account',headers=a,json=mutation(20,name='내 이름',phone='01000000000')).status_code==200
    new_session=login(c)
    assert c.get(P+'/account',headers=new_session).json()['profile']['name']=='내 이름'
    assert c.put(P+'/account',headers=new_session,json=mutation(21,name='',phone='')).status_code==200
    assert c.get(P+'/account',headers=new_session).json()['profile']=={'name':'','phone':''}
