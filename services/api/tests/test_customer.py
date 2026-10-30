from urllib.parse import urlparse, parse_qs
from uuid import uuid4
import sqlite3
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from test_public_catalog import prepared, publish
from test_inventory import AUTH, BASE

P='/api/v1/customer'

@pytest.fixture
def customer(tmp_path):
    env=tmp_path/'.env'
    env.write_text('STORE_ADMIN_TOKEN=inventory-test-only\nGOOGLE_CLIENT_ID=test\nGOOGLE_CLIENT_SECRET=secret\nKAKAO_CLIENT_ID=test\nKAKAO_CLIENT_SECRET=secret\n')
    calls=[]; now=[1000.0]
    def transport(url,data=None,token=None):
        calls.append((url,data,token))
        return {'access_token':'provider-secret'} if data is not None else {'sub':'subject-1','id':123}
    path=tmp_path/'customers.sqlite3'
    client=TestClient(create_app(env_file=env,catalog_path=tmp_path/'catalog.sqlite3',storefront_path=tmp_path/'store.json',design_path=tmp_path/'designs.sqlite3',customer_path=path,customer_transport=transport,customer_clock=lambda:now[0]))
    return client,path,calls,now

def flow(client,provider='google',return_to='/cart'):
    r=client.post(P+f'/oauth/{provider}/start',json={'return_to':return_to})
    assert r.status_code==200,r.text
    body=r.json(); query=parse_qs(urlparse(body['authorization_url']).query)
    assert query['code_challenge_method']==['S256']
    assert query.get('scope')==(['openid profile email'] if provider=='google' else None)
    return {'code':'code','state':query['state'][0],'flow_token':body['flow_token']}

def login(client,provider='google'):
    r=client.post(P+f'/oauth/{provider}/finish',json=flow(client,provider)); assert r.status_code==200,r.text
    return {'Authorization':'Bearer '+r.json()['session_token']}

def test_flow_binding_replay_expiry_and_hash_storage(customer):
    c,path,calls,now=customer; body=flow(c)
    assert c.post(P+'/oauth/kakao/finish',json=body).status_code==400
    assert c.post(P+'/oauth/google/finish',json=body|{'flow_token':'wrong'}).status_code==400
    r=c.post(P+'/oauth/google/finish',json=body); assert r.status_code==200,r.text
    token=r.json()['session_token']; auth={'Authorization':'Bearer '+token}
    assert c.post(P+'/oauth/google/finish',json=body).status_code==400
    assert len(calls)==2 and calls[1][2]=='provider-secret'
    assert c.get(P+'/me',headers=AUTH).status_code==401
    assert c.get(P+'/me',headers=auth).status_code==200
    with sqlite3.connect(path) as db:
        dump='\n'.join(db.iterdump()); assert token not in dump and 'provider-secret' not in dump
    assert c.post(P+'/logout',headers=auth).status_code==200
    assert c.get(P+'/me',headers=auth).status_code==401
    expired=flow(c); now[0]+=601
    assert c.post(P+'/oauth/google/finish',json=expired).status_code==400

@pytest.mark.parametrize('target',['https://evil.test','//evil.test','/cart\\evil','/cart?next=https://evil.test','/admin','/products/../admin'])
def test_return_path_rejected(customer,target):
    assert customer[0].post(P+'/oauth/google/start',json={'return_to':target}).status_code==422

def test_cart_validation_isolation_idempotency_and_repricing(customer):
    c,_,_,_=customer; auth=login(c); other=login(c,'kakao')
    pid,option,_=prepared(c); assert publish(c,pid).status_code==200
    url=P+'/cart/items/'+option['id']; body={'quantity':2,'version':0,'request_id':str(uuid4())}
    assert c.put(url,json=body).status_code==401
    assert c.put(url,headers=auth,json=body|{'quantity':True}).status_code==422
    assert c.put(url,headers=auth,json=body|{'quantity':5}).status_code==409
    r=c.put(url,headers=auth,json=body); assert r.status_code==200,r.text
    assert r.json()['total']==24000 and r.json()['version']==1
    assert c.put(url,headers=auth,json=body).json()['version']==1
    assert c.put(url,headers=auth,json=body|{'quantity':1}).status_code==409
    assert c.put(url,headers=auth,json=body|{'request_id':str(uuid4())}).status_code==409
    assert c.get(P+'/cart',headers=other).json()['items']==[]
    assert publish(c,pid,1,price=None).status_code==200
    cart=c.get(P+'/cart',headers=auth).json(); assert cart['has_unavailable'] and cart['total']==0
    assert publish(c,pid,2,'paused').status_code==200
    item=c.get(P+'/cart',headers=auth).json()['items'][0]; assert item['name']=='구매할 수 없는 상품' and item['color']==''
    assert c.request('DELETE',url,headers=auth,json={'version':1,'request_id':str(uuid4())}).json()['items']==[]
    assert c.get(BASE+'/catalog',headers=AUTH).json()['skus'][0]['on_hand']==4

def test_expired_session_and_disabled_provider(customer,tmp_path):
    c,_,_,now=customer; auth=login(c)
    now[0]+=604800
    assert c.get(P+'/cart',headers=auth).status_code==401
    env=tmp_path/'empty.env'; env.write_text('')
    disabled=TestClient(create_app(env_file=env,catalog_path=tmp_path/'other.sqlite3',storefront_path=tmp_path/'other.json',design_path=tmp_path/'other-designs.sqlite3'))
    assert not any(p['enabled'] for p in disabled.get(P+'/providers').json()['providers'])
    assert disabled.post(P+'/oauth/google/start',json={}).status_code==503

def test_provider_failure_is_redacted_and_consumes_flow(customer,monkeypatch):
    c,path,_,_=customer
    # The transport closure is replaced on the bound store through its route dependency.
    from app.customer import CustomerStore, Start, Finish
    store=CustomerStore(path,None,transport=lambda *a,**k: (_ for _ in ()).throw(RuntimeError('secret-provider-error')))
    store.credentials={'google':('id','secret'),'kakao':('id','secret')}
    started=store.start('google',Start())
    body=Finish(code='code',state=parse_qs(urlparse(started['authorization_url']).query)['state'][0],flow_token=started['flow_token'])
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as failure: store.finish('google',body)
    assert failure.value.status_code==502 and 'secret' not in failure.value.detail
    with pytest.raises(HTTPException) as replay: store.finish('google',body)
    assert replay.value.status_code==400

@pytest.mark.parametrize('quantity',[0,100,-1,'2',None])
def test_quantity_boundaries_and_extra_fields(customer,quantity):
    c,_,_,_=customer; auth=login(c)
    assert c.put(P+'/cart/items/fake',headers=auth,json={'quantity':quantity,'version':0,'request_id':str(uuid4())}).status_code==422
    assert c.put(P+'/cart/items/fake',headers=auth,json={'quantity':1,'version':0,'request_id':str(uuid4()),'price':1}).status_code==422

def test_cart_100_row_limit_and_existing_row_updates(customer):
    c,path,_,_=customer; auth=login(c); customer_id=c.get(P+'/me',headers=auth).json()['customer']['id']
    pid,option,_=prepared(c); assert publish(c,pid).status_code==200
    with sqlite3.connect(path) as db:
        db.executemany('INSERT INTO cart_items VALUES(?,?,?)',[(customer_id,'missing-'+str(i),1) for i in range(100)])
    url=P+'/cart/items/'+option['id']
    assert c.put(url,headers=auth,json={'quantity':1,'version':0,'request_id':str(uuid4())}).status_code==409
    assert c.request('DELETE',P+'/cart/items/missing-0',headers=auth,json={'version':0,'request_id':str(uuid4())}).status_code==200
    assert c.put(url,headers=auth,json={'quantity':1,'version':1,'request_id':str(uuid4())}).status_code==200
    assert c.put(url,headers=auth,json={'quantity':2,'version':2,'request_id':str(uuid4())}).status_code==200

def test_same_subject_persists_and_cart_reprices_discount(customer):
    c,_,_,_=customer; first=login(c); second=login(c)
    assert c.get(P+'/me',headers=first).json()==c.get(P+'/me',headers=second).json()
    pid,option,_=prepared(c); assert publish(c,pid).status_code==200
    assert c.put(P+'/cart/items/'+option['id'],headers=first,json={'quantity':2,'version':0,'request_id':str(uuid4())}).status_code==200
    assert c.put(BASE+f'/products/{pid}/publication',headers=AUTH,json={'version':1,'status':'published','price':12000,'discount_price':9000}).status_code==200
    cart=c.get(P+'/cart',headers=second).json()
    assert cart['total']==18000 and cart['item_count']==2 and cart['items'][0]['effective_price']==9000

def test_concurrent_cart_writers_only_one_version_wins(customer):
    from concurrent.futures import ThreadPoolExecutor
    c,_,_,_=customer; auth=login(c)
    pid,option,_=prepared(c); assert publish(c,pid).status_code==200
    def write(quantity):
        return c.put(P+'/cart/items/'+option['id'],headers=auth,json={'quantity':quantity,'version':0,'request_id':str(uuid4())}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(write,[1,2]))==[200,409]
    assert c.get(P+'/cart',headers=auth).json()['version']==1

@pytest.mark.parametrize('identity',[{}, {'sub':''}, {'sub':True}, {'id_token':'unverified.jwt.value'}])
def test_missing_or_unverified_identity_never_creates_session(tmp_path,identity):
    from app.customer import CustomerStore, Start, Finish
    from fastapi import HTTPException
    store=CustomerStore(tmp_path/'customer.sqlite3',None,transport=lambda url,data=None,token=None: {'access_token':'token'} if data else identity)
    store.credentials={'google':('id','secret'),'kakao':('id','secret')}
    started=store.start('google',Start())
    body=Finish(code='code',state=parse_qs(urlparse(started['authorization_url']).query)['state'][0],flow_token=started['flow_token'])
    with pytest.raises(HTTPException) as failure: store.finish('google',body)
    assert failure.value.status_code==502
    with sqlite3.connect(store.path) as db: assert db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0]==0

def test_flow_and_session_capacity_and_future_schema(customer):
    c,path,_,_=customer; first=login(c)
    for _ in range(20): latest=login(c)
    assert c.get(P+'/me',headers=first).status_code==401
    assert c.get(P+'/me',headers=latest).status_code==200
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0]==20
        db.executemany('INSERT INTO flows VALUES(?,?,?,?,?,?)',[(str(i),'hash','google','verifier','/cart',9999) for i in range(1000)])
    assert c.post(P+'/oauth/google/start',json={}).status_code==429
    with sqlite3.connect(path) as db: db.execute('PRAGMA user_version=2')
    assert c.get(P+'/me',headers=latest).status_code==503

def test_zero_price_quantity_99_and_distinct_subject(customer):
    c,path,_,_=customer; auth=login(c)
    pid,option,_=prepared(c); assert publish(c,pid,price=0).status_code==200
    assert c.post(BASE+'/inventory/movements',headers=AUTH,json={'sku_id':option['id'],'version':1,'delta':95,'reason_code':'adjust_in','request_id':str(uuid4())}).status_code==200
    response=c.put(P+'/cart/items/'+option['id'],headers=auth,json={'quantity':99,'version':0,'request_id':str(uuid4())})
    assert response.status_code==200 and response.json()['total']==0 and not response.json()['has_unavailable']
    assert c.get(BASE+'/catalog',headers=AUTH).json()['skus'][0]['on_hand']==99
    from app.customer import CustomerStore, Start, Finish
    store=CustomerStore(path,None,clock=lambda:1000,transport=lambda url,data=None,token=None: {'access_token':'token'} if data else {'sub':'distinct-subject','email':'same@example.invalid'})
    store.credentials={'google':('id','secret'),'kakao':('id','secret')}
    started=store.start('google',Start())
    result=store.finish('google',Finish(code='code',state=parse_qs(urlparse(started['authorization_url']).query)['state'][0],flow_token=started['flow_token']))
    assert result['customer']['id']!=c.get(P+'/me',headers=auth).json()['customer']['id']
    with sqlite3.connect(path) as db: assert 'same@example.invalid' not in '\n'.join(db.iterdump())

@pytest.mark.parametrize('token',[None,True,'',123])
def test_invalid_provider_token_denied(tmp_path,token):
    from app.customer import CustomerStore, Start, Finish
    from fastapi import HTTPException
    store=CustomerStore(tmp_path/'customer.sqlite3',None,transport=lambda *a,**kw:{'access_token':token})
    store.credentials={'google':('id','secret'),'kakao':('id','secret')}
    started=store.start('google',Start())
    with pytest.raises(HTTPException) as failure:
        store.finish('google',Finish(code='code',state=parse_qs(urlparse(started['authorization_url']).query)['state'][0],flow_token=started['flow_token']))
    assert failure.value.status_code==502

def test_injected_catalog_defaults_customer_database_to_isolated_sibling(tmp_path):
    env=tmp_path/'empty.env'; env.write_text('')
    for name in ['one','two']:
        client=TestClient(create_app(env_file=env,catalog_path=tmp_path/(name+'.sqlite3'),storefront_path=tmp_path/(name+'.json'),design_path=tmp_path/(name+'-designs.sqlite3')))
        assert client.get(P+'/me',headers={'Authorization':'Bearer invalid'}).status_code==401
        assert (tmp_path/(name+'.customers.sqlite3')).exists()





@pytest.mark.parametrize('provider,identity,name,email', [
    ('google', {'sub':'synthetic','name':'테스트 고객','email':'sample@example.test','email_verified':True}, '테스트 고객','sample@example.test'),
    ('google', {'sub':'synthetic','name':'테스트 고객','email':'sample@example.test','email_verified':'true'}, '테스트 고객',None),
    ('kakao', {'id':123,'kakao_account':{'profile':{'nickname':'테스트'},'email':'sample@example.test','is_email_valid':True,'is_email_verified':True}}, '테스트','sample@example.test'),
    ('kakao', {'id':123,'kakao_account':{'email':'sample@example.test','is_email_verified':True}}, '고객',None),
    ('kakao', {'id':123,'kakao_account':None}, '고객',None),
])
def test_optional_profile_and_existing_session(tmp_path,provider,identity,name,email):
    from app.customer import CustomerStore,Start,Finish
    env=tmp_path/'profile.env';env.write_text('CUSTOMER_WEB_ORIGIN=http://localhost:3100\n',encoding='utf-8')
    store=CustomerStore(tmp_path/'profile.sqlite3',None,env_file=env,transport=lambda url,data=None,token=None: {'access_token':'synthetic-token'} if data else identity)
    store.credentials={provider:('synthetic-id','synthetic-secret')}
    def sign_in():
        start=store.start(provider,Start()); state=parse_qs(urlparse(start['authorization_url']).query)['state'][0]
        return store.finish(provider,Finish(code='synthetic',state=state,flow_token=start['flow_token']))
    if provider=='google': identity['picture']='https://lh3.googleusercontent.com/a/synthetic'
    first=sign_in(); customer_id=first['customer']['id']
    if provider=='google': assert first['customer']['avatar_url']=='https://lh3.googleusercontent.com/a/synthetic'
    assert first['customer']['display_name']==name
    assert first['customer']['email']==email
    with store.transaction() as db:
        db.execute('INSERT INTO carts VALUES(?,?)',(customer_id,7))
        db.execute('DROP TABLE customer_profiles')
    old=store.authenticate('Bearer '+first['session_token'])
    assert old['id']==customer_id and old['profile_available'] is False
    second=sign_in()
    assert second['customer']['id']==customer_id
    assert store.authenticate('Bearer '+first['session_token'])==second['customer']
    with store.transaction() as db:
        assert db.execute('SELECT version FROM carts WHERE customer_id=?',(customer_id,)).fetchone()[0]==7
    identity.clear();identity.update({'sub':'synthetic'} if provider=='google' else {'id':123})
    cleared=sign_in()['customer']
    assert cleared['email'] is None and cleared['avatar_url'] is None


@pytest.mark.parametrize('provider,identity,expected',[
 ('google',{'picture':'https://lh3.googleusercontent.com/a/avatar'},'https://lh3.googleusercontent.com/a/avatar'),
 ('kakao',{'kakao_account':{'profile':{'profile_image_url':'http://k.kakaocdn.net/avatar'}}},'https://k.kakaocdn.net/avatar'),
 ('google',{'picture':'https://googleusercontent.com.evil.test/a'},None),
 ('google',{'picture':'https://user:password@lh3.googleusercontent.com/a'},None),
 ('google',{'picture':'data:image/svg+xml,test'},None),
 ('google',{'picture':'https://lh3.googleusercontent.com:444/a'},None),
 ('kakao',{'kakao_account':None},None),
])
def test_avatar_url_allowlist(provider,identity,expected):
 from app.customer import CustomerStore
 assert CustomerStore.avatar(provider,identity)==expected
