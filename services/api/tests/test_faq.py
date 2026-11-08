from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from app.faq import register_faq_routes

@pytest.fixture
def client(tmp_path):
    app=FastAPI()
    register_faq_routes(app, lambda: None, tmp_path/'faq.sqlite3')
    return TestClient(app)

def item(**kwargs):
    return {**dict(category='shipping',question='배송은 언제 오나요?',answer='결제 확인 후 1~3영업일 이내 출고합니다.',position=10,published=False,version=0), **kwargs}

def test_visibility_retry_conflict_and_sort(client):
    uid=str(uuid4()); url='/api/v1/admin/faq/'+uid; body=item()
    saved=client.put(url,json=body); assert saved.status_code==200
    assert saved.json()['version']==1
    assert client.put(url,json=body).json()==saved.json()
    assert client.get('/api/v1/faq').json()['items']==[]
    published={**body,'version':1,'published':True}
    assert client.put(url,json=published).status_code==200
    assert len(client.get('/api/v1/faq').json()['items'])==1
    assert client.put(url,json={**published,'answer':'다른 내용','version':1}).status_code==409
    assert client.put(url,json={**published,'version':2,'published':False}).status_code==200
    assert client.get('/api/v1/faq').json()['items']==[]
    assert client.get(url).headers['cache-control']=='no-store'

@pytest.mark.parametrize('patch',[{'category':'secret'},{'question':' '},{'answer':''},{'position':-1},{'position':True},{'published':'true'},{'version':-1},{'answer':'x'*5001},{'unexpected':1}])
def test_validation(client,patch):
    assert client.put('/api/v1/admin/faq/'+str(uuid4()),json={**item(),**patch}).status_code==422

def test_admin_auth(tmp_path):
    app=FastAPI()
    def deny(): raise HTTPException(401)
    register_faq_routes(app,deny,tmp_path/'faq.sqlite3'); c=TestClient(app)
    assert c.get('/api/v1/admin/faq').status_code==401
    assert c.put('/api/v1/admin/faq/'+str(uuid4()),json=item()).status_code==401
    assert c.get('/api/v1/faq').status_code==200


def test_public_order_and_admin_hidden_rows(client):
    rows = [
        ('00000000-0000-0000-0000-000000000003', 20, True),
        ('00000000-0000-0000-0000-000000000002', 5, True),
        ('00000000-0000-0000-0000-000000000001', 5, True),
        ('00000000-0000-0000-0000-000000000004', 0, False),
    ]
    for uid, position, published in rows:
        assert client.put('/api/v1/admin/faq/' + uid, json=item(position=position, published=published)).status_code == 200
    public_ids = [x['id'] for x in client.get('/api/v1/faq').json()['items']]
    assert public_ids == [rows[2][0], rows[1][0], rows[0][0]]
    assert [x['id'] for x in client.get('/api/v1/admin/faq').json()['items']] == [rows[3][0], *public_ids]
    assert client.put('/api/v1/admin/faq/' + rows[0][0], json=item(position=1, published=True, version=1)).status_code == 200
    assert [x['id'] for x in client.get('/api/v1/faq').json()['items']] == [rows[0][0], rows[2][0], rows[1][0]]


def test_simultaneous_edits_do_not_overwrite_each_other(client):
    url = '/api/v1/admin/faq/' + str(uuid4())
    assert client.put(url, json=item()).status_code == 200
    barrier = Barrier(2)
    def edit(answer):
        barrier.wait(timeout=5)
        return client.put(url, json=item(answer=answer, version=1))
    with ThreadPoolExecutor(max_workers=2) as pool:
        a = pool.submit(edit, '첫 번째 관리자 답변')
        b = pool.submit(edit, '두 번째 관리자 답변')
        results = [a.result(timeout=15), b.result(timeout=15)]
    assert sorted(r.status_code for r in results) == [200, 409]
    winner = next(r.json() for r in results if r.status_code == 200)
    persisted = client.get(url).json()
    assert persisted == winner
    assert persisted['version'] == 2


def test_simultaneous_create_retry_returns_one_saved_item(client):
    url = '/api/v1/admin/faq/' + str(uuid4())
    barrier = Barrier(2)
    def create():
        barrier.wait(timeout=5)
        return client.put(url, json=item())
    with ThreadPoolExecutor(max_workers=2) as pool:
        a = pool.submit(create)
        b = pool.submit(create)
        results = [a.result(timeout=15), b.result(timeout=15)]
    assert [r.status_code for r in results] == [200, 200]
    assert results[0].json() == results[1].json()
    assert results[0].json()['version'] == 1
    assert len(client.get('/api/v1/admin/faq').json()['items']) == 1
