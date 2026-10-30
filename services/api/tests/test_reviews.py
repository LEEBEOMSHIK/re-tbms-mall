from concurrent.futures import ThreadPoolExecutor
import json
import sqlite3
from uuid import uuid4
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import create_app
from app.reviews import ReviewCustomer
from test_inventory import AUTH, BASE
from test_public_catalog import prepared, publish


class TrustedPurchases:
    def __init__(self): self.allowed={('buyer1','*'),('buyer2','*')}
    def authenticate(self,request):
        value=request.headers.get('authorization','')
        if value not in ['Bearer buyer1','Bearer buyer2','Bearer stranger']: raise HTTPException(401,'No customer identity.')
        name=value.split()[1]
        return ReviewCustomer(name,'검증 구매자 '+name[-1])
    def purchase_reference(self,customer,product_id):
        return 'trusted-purchase-'+customer.customer_id if (customer.customer_id,'*') in self.allowed or (customer.customer_id,product_id) in self.allowed else None


@pytest.fixture
def context(monkeypatch,tmp_path):
    monkeypatch.delenv('STORE_ADMIN_TOKEN',raising=False)
    env=tmp_path/'.env';env.write_text('STORE_ADMIN_TOKEN=inventory-test-only\n',encoding='utf-8')
    path=tmp_path/'catalog.sqlite3';verifier=TrustedPurchases()
    kwargs={'env_file':env,'catalog_path':path,'storefront_path':tmp_path/'storefront.json'}
    client=TestClient(create_app(**kwargs,review_verifier=verifier))
    pid,sku,image=prepared(client);assert publish(client,pid).status_code==200
    return client,pid,verifier,path,kwargs


def create(client,pid,buyer='buyer1',rating=5,body='Verified review',id=None):
    return client.post(f'/api/v1/products/{pid}/reviews',headers={'Authorization':'Bearer '+buyer},json={'id':id or str(uuid4()),'rating':rating,'body':body})


def moderate(client,row,**changes):
    return client.put(BASE+'/reviews/'+row['id'],headers=AUTH,json={'version':row['version'],'hidden':False,'reply':'','reason':'검토 결과',**changes})


def listing(client,pid,**params):
    response=client.get(f'/api/v1/products/{pid}/reviews',params=params);assert response.status_code==200,response.text
    return response.json()


def test_default_customer_writes_fail_closed_and_claims_cannot_enable(context):
    _,pid,_,_,kwargs=context;client=TestClient(create_app(**kwargs));body={'id':str(uuid4()),'rating':5,'body':'Fake'}
    assert client.post(f'/api/v1/products/{pid}/reviews',json=body).status_code==401
    for token in ['buyer1','inventory-test-only','factory-session','forged']:
        assert client.post(f'/api/v1/products/{pid}/reviews',headers={'Authorization':'Bearer '+token},json=body).status_code==503
    for claim in ['customer_id','purchase_id','is_purchaser','verified_purchase']:
        assert client.post(f'/api/v1/products/{pid}/reviews',json=body|{claim:'yes'}).status_code==422
    assert listing(client,pid)['summary']=={'review_count':0,'average_rating':None}
    assert listing(client,pid)['can_write'] is False
    for method in ['put','delete']:
        data={'version':0}|({'rating':5,'body':'x'} if method=='put' else {})
        assert client.request(method.upper(),f'/api/v1/products/{pid}/reviews/id',json=data).status_code==401


def test_verified_create_idempotence_one_active_and_private_fields(context):
    client,pid,_,_,_=context;id=str(uuid4())
    assert create(client,pid,'stranger').status_code==403
    row=create(client,pid,id=id);assert row.status_code==201,row.text
    assert create(client,pid,id=id).json()==row.json()
    assert create(client,pid,id=id,body='Different').status_code==409
    assert create(client,pid).status_code==409
    data=listing(client,pid);assert data['summary']=={'review_count':1,'average_rating':5.0}
    assert client.get('/api/v1/products/'+pid).json()['review_summary']==data['summary']
    public=json.dumps(data)
    for key in ['customer_id','purchase_reference','request_hash','hidden','history','reason','version']:
        assert '"'+key+'"' not in public


def test_ownership_purchase_checks_edit_delete_and_average(context):
    client,pid,verifier,_,_=context
    a=create(client,pid,rating=5).json();b=create(client,pid,buyer='buyer2',rating=2).json()
    assert listing(client,pid)['summary']=={'review_count':2,'average_rating':3.5}
    route=f"/api/v1/products/{pid}/reviews/{a['id']}"
    assert client.put(route,headers={'Authorization':'Bearer buyer2'},json={'version':0,'rating':1,'body':'Hijack'}).status_code==404
    verifier.allowed.remove(('buyer1','*'))
    assert client.put(route,headers={'Authorization':'Bearer buyer1'},json={'version':0,'rating':1,'body':'No purchase'}).status_code==403
    verifier.allowed.add(('buyer1','*'))
    result=client.put(route,headers={'Authorization':'Bearer buyer1'},json={'version':0,'rating':4,'body':'Updated'});assert result.status_code==200
    assert listing(client,pid)['summary']['average_rating']==3.0
    assert client.put(route,headers={'Authorization':'Bearer buyer1'},json={'version':0,'rating':1,'body':'Stale'}).status_code==409
    assert client.request('DELETE',route,headers={'Authorization':'Bearer buyer1'},json={'version':1}).status_code==200
    assert listing(client,pid)['summary']=={'review_count':1,'average_rating':2.0}
    deleted=client.get(BASE+'/reviews/'+a['id'],headers=AUTH).json();assert deleted['deleted']
    assert moderate(client,deleted).status_code==409
    assert create(client,pid,rating=1).status_code==201
    assert len(client.get(BASE+'/reviews',headers=AUTH).json()['reviews'])==3


def test_hide_restore_reply_history_and_product_privacy(context):
    client,pid,_,_,_=context;a=create(client,pid).json()
    assert client.get(BASE+'/reviews').status_code==401
    assert client.get(BASE+'/reviews',headers={'Authorization':'Bearer buyer1'}).status_code==401
    hidden=moderate(client,a,hidden=True,reply='관리자 답변').json()
    assert hidden['hidden'] and hidden['reply']=='관리자 답변'
    assert listing(client,pid)['summary']=={'review_count':0,'average_rating':None}
    assert client.get('/api/v1/products/'+pid).json()['review_summary']['average_rating'] is None
    restored=moderate(client,hidden,reply='공개 답변').json()
    assert len(restored['history'])==3 and restored['history'][0]['action']=='restored'
    assert listing(client,pid)['reviews'][0]['reply']=='공개 답변'
    assert moderate(client,a).status_code==409
    assert publish(client,pid,1,'paused').status_code==200
    assert client.get(f'/api/v1/products/{pid}/reviews').status_code==404
    assert client.get(BASE+'/reviews',headers=AUTH).status_code==200


@pytest.mark.parametrize('patch',[{'rating':0},{'rating':6},{'rating':True},{'body':''},{'body':' '},{'body':'x'*3001},{'id':'bad'}])
def test_create_boundaries(context,patch):
    client,pid,_,_,_=context
    assert client.post(f'/api/v1/products/{pid}/reviews',headers={'Authorization':'Bearer buyer1'},json={'id':str(uuid4()),'rating':5,'body':'Review'}|patch).status_code==422


@pytest.mark.parametrize('patch',[{'reason':''},{'reason':' '},{'reason':'x'*501},{'reply':'x'*2001},{'hidden':1},{'version':True},{'rating':1}])
def test_moderation_validation_preserves(context,patch):
    client,pid,_,_,_=context;a=create(client,pid).json()
    before=client.get(BASE+'/reviews/'+a['id'],headers=AUTH).json()
    assert moderate(client,a,**patch).status_code==422
    assert client.get(BASE+'/reviews/'+a['id'],headers=AUTH).json()==before


def test_pagination_filters_and_invalid_parameters(context):
    client,pid,_,_,_=context;a=create(client,pid).json();create(client,pid,'buyer2',rating=1)
    for size in (10,20,50):
        data=listing(client,pid,page=1,page_size=size);assert data['page_size']==size and data['total']==2
    assert listing(client,pid,page=2,page_size=10)['reviews']==[]
    for query in [{'page':0},{'page_size':11},{'page':'x'}]: assert client.get(f'/api/v1/products/{pid}/reviews',params=query).status_code==422
    assert moderate(client,a,hidden=True).status_code==200
    assert len(client.get(BASE+'/reviews?visibility=hidden',headers=AUTH).json()['reviews'])==1
    assert len(client.get(BASE+'/reviews?visibility=visible',headers=AUTH).json()['reviews'])==1
    assert client.get(BASE+'/reviews?visibility=invalid',headers=AUTH).status_code==422


def test_concurrent_review_and_moderation_versions(context):
    client,pid,_,_,_=context
    with ThreadPoolExecutor(max_workers=2) as pool: statuses=list(pool.map(lambda _:create(client,pid).status_code,range(2)))
    assert sorted(statuses)==[201,409]
    row=client.get(BASE+'/reviews',headers=AUTH).json()['reviews'][0]
    with ThreadPoolExecutor(max_workers=2) as pool: statuses=list(pool.map(lambda _:moderate(client,row,hidden=True).status_code,range(2)))
    assert sorted(statuses)==[200,409]


def test_schema14_backup_and_existing_business_rows_preserved(context):
    client,pid,_,path,_=context
    before=client.get(BASE+'/catalog',headers=AUTH).json()
    with sqlite3.connect(path) as db:
        db.execute('ALTER TABLE products DROP COLUMN details')
        db.execute('ALTER TABLE product_publications DROP COLUMN discount_price');db.execute('ALTER TABLE publication_history DROP COLUMN discount_price');db.execute('DROP TABLE review_history');db.execute('DROP TABLE product_reviews');db.execute('PRAGMA user_version=14')
    assert client.get(BASE+'/catalog',headers=AUTH).json()==before
    backups=list(path.parent.glob(path.name+'.pre-v15-*.bak'));assert backups
    with sqlite3.connect(backups[0]) as db: assert db.execute('PRAGMA user_version').fetchone()[0]==14
    with sqlite3.connect(path) as db: assert db.execute('PRAGMA user_version').fetchone()[0]==17


def test_verifier_failure_is_closed(context):
    client,pid,verifier,path,kwargs=context
    def fail(*args): raise RuntimeError('private provider detail')
    verifier.authenticate=fail
    response=create(client,pid)
    assert response.status_code==503 and 'private provider detail' not in response.text
    assert listing(client,pid)['total']==0


def test_purchase_provider_failure_and_customer_cross_product(context):
    client,pid,verifier,_,_=context
    row=create(client,pid).json()
    # Verified for one product does not grant ownership or access under another product URL.
    response=client.put(f"/api/v1/products/other/reviews/{row['id']}",headers={'Authorization':'Bearer buyer1'},json={'version':0,'rating':1,'body':'Wrong product'})
    assert response.status_code==404
    def fail(*args): raise RuntimeError('purchase secret')
    verifier.purchase_reference=fail
    response=client.put(f"/api/v1/products/{pid}/reviews/{row['id']}",headers={'Authorization':'Bearer buyer1'},json={'version':0,'rating':1,'body':'Blocked'})
    assert response.status_code==503 and 'purchase secret' not in response.text
    assert listing(client,pid)['summary']['average_rating']==5.0
