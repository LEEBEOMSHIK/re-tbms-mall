from uuid import uuid4
import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
from app.inquiries import register_inquiry_routes
class Customers:
    def authenticate(self, authorization):
        if authorization not in ('Bearer customer-a','Bearer customer-b'): raise HTTPException(401)
        return {'id':authorization}
@pytest.fixture
def client(tmp_path):
    app=FastAPI()
    def admin(authorization:str|None=Header(default=None)):
        if authorization!='Bearer admin': raise HTTPException(401)
    register_inquiry_routes(app,Customers(),admin,tmp_path/'inquiries.sqlite3')
    return TestClient(app)
def headers(who='customer-a'): return {'Authorization':'Bearer '+who}
def body(**kw): return {'category':'product','title':'합성 문의','content':'상품 사이즈 안내를 부탁합니다.',**kw}
def test_private_flow(client):
    uid=str(uuid4()); c='/api/v1/customer/inquiries'; a='/api/v1/admin/inquiries'
    assert client.get(c).status_code==401
    assert client.get(a,headers=headers()).status_code==401
    r=client.put(c+'/'+uid,headers=headers(),json=body()); assert r.status_code==200
    assert client.put(c+'/'+uid,headers=headers(),json=body()).json()==r.json()
    assert client.put(c+'/'+uid,headers=headers(),json=body(title='변경')).status_code==409
    assert client.get(c+'/'+uid,headers=headers('customer-b')).status_code==404
    assert client.put(c+'/'+uid,headers=headers('customer-b'),json=body()).status_code==404
    assert client.get(c,headers=headers('customer-b')).json()['total']==0
    listing=client.get(a,headers=headers('admin')).json(); assert listing['total']==1
    assert 'content' not in listing['items'][0] and 'owner' not in listing['items'][0]
    reply={'answer':'합성 관리자 답변입니다.','version':1}
    result=client.put(a+'/'+uid,headers=headers('admin'),json=reply); assert result.status_code==200
    assert client.put(a+'/'+uid,headers=headers('admin'),json=reply).json()==result.json()
    assert client.put(a+'/'+uid,headers=headers('admin'),json={**reply,'answer':'충돌'}).status_code==409
    detail=client.get(c+'/'+uid,headers=headers()); assert detail.json()['answer']==reply['answer']
    assert detail.headers['cache-control']=='no-store'
@pytest.mark.parametrize('patch',[{'title':' '},{'content':''},{'content':'a'*5001},{'title':'a'*151},{'category':'bad'},{'owner':'customer-b'}])
def test_invalid(client,patch):
    assert client.put('/api/v1/customer/inquiries/'+str(uuid4()),headers=headers(),json=body(**patch)).status_code==422

def test_pagination(client):
    for _ in range(21): assert client.put('/api/v1/customer/inquiries/'+str(uuid4()),headers=headers(),json=body()).status_code==200
    a=client.get('/api/v1/customer/inquiries',headers=headers()).json()
    b=client.get('/api/v1/customer/inquiries?page=2',headers=headers()).json()
    assert len(a['items'])==20 and len(b['items'])==1 and a['total']==21
    assert not set(x['id'] for x in a['items']) & set(x['id'] for x in b['items'])

def test_oauth_inquiry_return():
    from app.customer import safe_return
    for path in ['/account/inquiries','/account/inquiries/new','/account/inquiries/00000000-0000-0000-0000-000000000001']:
        assert safe_return(path)==path
    with pytest.raises(ValueError): safe_return('/account/inquiries/../admin')

def test_filters_before_pagination_and_ownership(client):
    c='/api/v1/customer/inquiries'; a='/api/v1/admin/inquiries'
    uid=str(uuid4()); client.put(c+'/'+uid,headers=headers(),json=body(title='배송 일정',content='합성 문의 본문',category='shipping'))
    client.put(a+'/'+uid,headers=headers('admin'),json={'answer':'답변','version':1})
    for _ in range(21): client.put(c+'/'+str(uuid4()),headers=headers(),json=body())
    assert client.get(c+'?q=배송&category=shipping&status=answered',headers=headers()).json()['total']==1
    assert client.get(c+'?q=합성 문의 본문',headers=headers()).json()['total']==1
    assert client.get(c+'?status=waiting',headers=headers()).json()['total']==21
    assert client.get(c+'?q=배송',headers=headers('customer-b')).json()['total']==0
    assert client.get(c+'?q=%25',headers=headers()).json()['total']==0
    assert client.get(c+'?category=bad',headers=headers()).status_code==422
    assert client.get(c+'?status=bad',headers=headers()).status_code==422
    assert client.get(c,params={'q':'x'*151},headers=headers()).status_code==422
    assert client.get(a+'?status=answered',headers=headers('admin')).json()['total']==1
