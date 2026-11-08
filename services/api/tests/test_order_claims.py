from uuid import uuid4
import base64
from io import BytesIO
from PIL import Image
import pytest
from test_customer import customer
from test_sales_orders import orders, add_order
from test_inventory import AUTH

PUBLIC = '/api/v1/customer/claims'
ADMIN = '/api/v1/admin/claims'

def payload(orders):
    c, store, first, _, uid, _ = orders
    oid = add_order(store, uid)
    order = c.get('/api/v1/customer/sales-orders/' + oid, headers=first).json()
    return dict(request_id=str(uuid4()), order_id=oid, line_id=order['lines'][0]['id'], kind='return', quantity=1, reason='defective', description='합성 검증 상품의 봉제 불량입니다.', received_date='2026-11-02', shipping=order['shipping'], photos=[])

def action(c, identifier, auth, version, name, **extra):
    return c.post((ADMIN if auth == AUTH else PUBLIC) + '/' + identifier, headers=auth, json=dict(request_id=str(uuid4()),version=version,action=name,note='합성 처리 확인',**extra))

def test_create_auth_quantity_and_idempotency(orders):
    c, store, auth, other, _, _ = orders
    body=payload(orders)
    assert c.post(PUBLIC,json=body).status_code == 401
    assert c.post(PUBLIC,headers=other,json=body).status_code == 404
    before=store.catalog.get()
    r=c.post(PUBLIC,headers=auth,json=body)
    assert r.status_code == 201,r.text
    claim=r.json()
    assert claim['status']=='requested' and claim['version']==1
    assert c.post(PUBLIC,headers=auth,json=body).json()==claim
    assert c.post(PUBLIC,headers=auth,json=body|{'quantity':2}).status_code==409
    assert c.post(PUBLIC,headers=auth,json=body|{'request_id':str(uuid4()),'quantity':2}).status_code==409
    assert c.get(PUBLIC+'/'+claim['id'],headers=other).status_code==404
    assert c.get(ADMIN+'/'+claim['id'],headers=auth).status_code==401
    summary=c.get(PUBLIC,headers=auth).json()['claims'][0]
    assert not {'shipping','description','photos'} & summary.keys()
    assert store.catalog.get()==before

def test_transitions_versions_and_no_external_completion(orders):
    c, _, auth, _, _, _=orders
    claim=c.post(PUBLIC,headers=auth,json=payload(orders)).json(); cid=claim['id']
    assert action(c,cid,auth,1,'review').status_code==409
    assert action(c,cid,AUTH,1,'receive').status_code==409
    for version,name,state in [(1,'review','reviewing'),(2,'approve_collection','collection_pending'),(3,'receive','received'),(4,'inspect','inspected'),(5,'queue_refund','refund_pending')]:
        r=action(c,cid,AUTH,version,name); assert r.status_code==200,r.text
        assert r.json()['status']==state
    assert action(c,cid,AUTH,4,'queue_refund').status_code==409
    assert action(c,cid,auth,5,'withdraw').status_code==409
    assert action(c,cid,AUTH,5,'complete').status_code==422

@pytest.mark.parametrize('origin',['received','inspected'])
def test_physical_conversion_preserves_inspection_and_cannot_withdraw(orders,origin):
    from test_public_catalog import prepared
    c,store,auth,_,_,_=orders
    _,sku,_=prepared(c)
    body=payload(orders)
    with store.transaction() as db:
        db.execute('UPDATE sales_order_lines SET sku_id=? WHERE id=?',(sku['id'],body['line_id']))
    claim=c.post(PUBLIC,headers=auth,json=body|{'kind':'exchange','target_sku_id':sku['id']}).json(); cid=claim['id']
    for version,name in [(1,'review'),(2,'approve_collection'),(3,'receive')]:
        assert action(c,cid,AUTH,version,name).status_code==200
    assert action(c,cid,AUTH,4,'queue_exchange').status_code==409
    version=4
    if origin=='inspected':
        assert action(c,cid,AUTH,version,'inspect').status_code==200
        version+=1
    conversion=action(c,cid,AUTH,version,'request_conversion').json()
    assert conversion['conversion_from']==origin
    assert 'withdraw' not in conversion['customer_actions']
    assert action(c,cid,auth,version+1,'withdraw').status_code==409
    result=action(c,cid,auth,version+1,'convert_return')
    assert result.status_code==200 and result.json()['status']==origin
    assert result.json()['conversion_from'] is None
    expected='queue_refund' if origin=='inspected' else 'inspect'
    assert expected in result.json()['admin_actions']

@pytest.mark.parametrize('change',[{'quantity':True},{'quantity':0},{'received_date':'2099-01-01'},{'received_date':'2020-01-01'},{'description':'short'},{'photos':['data:image/png;base64,aGVsbG8=']},{'target_sku_id':str(uuid4())}])
def test_invalid_inputs(orders,change):
    c,_,auth,_,_,_=orders
    assert c.post(PUBLIC,headers=auth,json=payload(orders)|change).status_code==422

def test_photos_private_and_sanitized(orders):
    c,_,auth,other,_,_=orders
    out=BytesIO(); Image.new('RGB',(2,2)).save(out,format='PNG')
    data='data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()
    r=c.post(PUBLIC,headers=auth,json=payload(orders)|{'photos':[data]})
    assert r.status_code==201,r.text
    assert r.json()['photos'][0].startswith('data:image/png;base64,')
    assert c.get(PUBLIC+'/'+r.json()['id'],headers=other).status_code==404
    assert c.get(PUBLIC+'/'+r.json()['id'],headers=auth).headers['cache-control']=='no-store'

def test_exchange_consent_replay_and_release(orders):
    from test_public_catalog import prepared
    c,store,auth,other,_,_=orders
    _,sku,_=prepared(c)
    body=payload(orders)
    with store.transaction() as db:
        db.execute('UPDATE sales_order_lines SET sku_id=? WHERE id=?',(sku['id'],body['line_id']))
    body|={'kind':'exchange','target_sku_id':sku['id'],'quantity':2}
    context=c.get('/api/v1/customer/claim-context/'+body['order_id'],headers=auth).json()
    assert context['eligible'] and context['lines'][0]['exchange_options'][0]['available_quantity']==4
    assert c.get('/api/v1/customer/claim-context/'+body['order_id'],headers=other).status_code==404
    claim=c.post(PUBLIC,headers=auth,json=body).json(); cid=claim['id']
    assert claim['target_color']==sku['color'] and claim['target_size']==sku['size']
    assert action(c,cid,AUTH,1,'review').status_code==200
    request=dict(request_id=str(uuid4()),version=2,action='request_conversion',note='합성 교환 품절 확인')
    conversion=c.post(ADMIN+'/'+cid,headers=AUTH,json=request)
    assert conversion.status_code==200
    assert conversion.json()['kind']=='exchange'
    assert action(c,cid,AUTH,3,'convert_return').status_code==409
    consent=action(c,cid,auth,3,'convert_return')
    assert consent.status_code==200 and consent.json()['kind']=='return'
    assert consent.json()['target_color'] is None and consent.json()['target_size'] is None
    assert c.post(ADMIN+'/'+cid,headers=AUTH,json=request).json()==conversion.json()
    assert c.post(ADMIN+'/'+cid,headers=AUTH,json=request|{'note':'다른 내용'}).status_code==409
    assert action(c,cid,auth,4,'withdraw').status_code==200
    assert c.post(PUBLIC,headers=auth,json=body|{'request_id':str(uuid4())}).status_code==201

def test_line_ownership_ineligible_and_body_limit(orders):
    c,store,auth,_,_,_=orders
    body=payload(orders); other=payload(orders)
    assert c.post(PUBLIC,headers=auth,json=body|{'line_id':other['line_id']}).status_code==404
    with store.transaction() as db:
        db.execute("UPDATE sales_orders SET payment_status='pending' WHERE id=?",(body['order_id'],))
    assert not c.get('/api/v1/customer/claim-context/'+body['order_id'],headers=auth).json()['eligible']
    assert c.post(PUBLIC,headers=auth,json=body).status_code==409
    assert c.post(PUBLIC,headers=auth,content=b' '*(9*1024*1024+1)).status_code==413

def test_concurrent_quantity_is_atomic(orders):
    from concurrent.futures import ThreadPoolExecutor
    from app.order_claims import ClaimCreate, ClaimStore
    from fastapi import HTTPException
    _,store,_,_,uid,_=orders
    body=payload(orders)|{'quantity':2}
    claims=ClaimStore(store.catalog)
    def submit(_):
        try:
            claims.create(ClaimCreate(**(body|{'request_id':str(uuid4())})),uid)
            return 201
        except HTTPException as exc: return exc.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(submit,range(2)))==[201,409]

def test_required_admin_note_and_pagination(orders):
    c,_,auth,_,_,_=orders
    for _ in range(3):
        claim=c.post(PUBLIC,headers=auth,json=payload(orders)).json()
    cid=claim['id']
    assert c.post(ADMIN+'/'+cid,headers=AUTH,json=dict(request_id=str(uuid4()),version=1,action='review',note=' ')).status_code==422
    first=c.get(PUBLIC,headers=auth,params={'limit':2}).json()
    second=c.get(PUBLIC,headers=auth,params={'limit':2,'cursor':first['next_cursor']}).json()
    assert len(first['claims'])==2 and len(second['claims'])==1 and second['next_cursor'] is None
    assert c.get(PUBLIC,headers=auth,params={'cursor':first['next_cursor'],'status':'reviewing'}).status_code==422

@pytest.mark.parametrize('path',['/account/claims','/account/claims/new?order_id='+str(uuid4()),'/account/claims/'+str(uuid4())])
def test_claim_login_return_allowed(customer,path):
    assert customer[0].post('/api/v1/customer/oauth/google/start',json={'return_to':path}).status_code==200
