import sqlite3
from uuid import uuid4

import pytest

from test_customer import customer, login
from test_inventory import AUTH
from app.inventory import CatalogStore
from app.sales_orders import SalesOrderStore

PUBLIC = '/api/v1/customer/sales-orders'
ADMIN = '/api/v1/admin/sales-orders'


def add_order(store, customer_id, *, at='2026-11-01T00:00:00Z', status='confirmed', number=None):
    order_id = str(uuid4())
    with store.transaction() as db:
        db.execute('''INSERT INTO sales_orders(id,public_number,customer_id,created_at,status,payment_status,fulfillment_status,goods_total,shipping_total,grand_total,is_demo)
            VALUES(?,?,?,?,?,'succeeded','partially_shipped',48000,3000,51000,1)''', (order_id, number or 'DEMO-' + order_id, customer_id, at, status))
        db.execute('INSERT INTO sales_order_lines VALUES(?,?,?,?,?,?,?,?,?,?)', (str(uuid4()), order_id, 0, 'synthetic-sku', '합성 티셔츠', '파랑', 'M', 2, 24000, 48000))
        db.execute('INSERT INTO sales_order_shipping VALUES(?,?,?,?,?,?,?)', (order_id, '합성 수령인', '01000000000', '00000', '합성시 테스트로 1', '테스트동', '합성 요청'))
        db.execute('INSERT INTO sales_order_shipments VALUES(?,?,?,?,?,?)', (str(uuid4()), order_id, '합성택배', 'DEMO-ONLY', 'shipped', 1))
        db.execute('INSERT INTO sales_order_events VALUES(?,?,?,?,?)', (str(uuid4()), order_id, 0, '합성 주문 기록', at))
    return order_id


@pytest.fixture
def orders(customer, tmp_path):
    client = customer[0]
    first, second = login(client), login(client, 'kakao')
    first_id = client.get('/api/v1/customer/me', headers=first).json()['customer']['id']
    second_id = client.get('/api/v1/customer/me', headers=second).json()['customer']['id']
    store = SalesOrderStore(CatalogStore(tmp_path / 'catalog.sqlite3'))
    return client, store, first, second, first_id, second_id


def test_empty_and_authorization(orders):
    client, _, first, _, _, _ = orders
    for url in [PUBLIC, ADMIN, PUBLIC + '/' + str(uuid4()), ADMIN + '/' + str(uuid4())]:
        assert client.get(url).status_code == 401
    assert client.get(PUBLIC, headers=AUTH).status_code == 401
    assert client.get(ADMIN, headers=first).status_code == 401
    assert client.get(PUBLIC, headers=first).json() == {'orders': [], 'next_cursor': None}
    assert client.get(ADMIN, headers=AUTH).json() == {'orders': [], 'next_cursor': None}
    assert client.get(PUBLIC, headers=first).headers['cache-control'] == 'no-store'


def test_owner_detail_snapshot_and_read_only(orders):
    c, store, first, second, first_id, _ = orders
    order_id = add_order(store, first_id)
    before = store.catalog.get()
    detail = c.get(PUBLIC + '/' + order_id, headers=first)
    assert detail.status_code == 200, detail.text
    body = detail.json()
    assert body['grand_total'] == 51000 and body['item_count'] == 2
    assert body['summary'] == '합성 티셔츠'
    assert body['lines'][0]['unit_price'] == 24000
    assert body['shipping']['recipient'] == '합성 수령인'
    assert body['shipments'][0]['quantity'] == 1 and body['is_demo'] is True
    assert c.get(ADMIN + '/' + order_id, headers=AUTH).json() == body
    assert c.get(PUBLIC + '/' + order_id, headers=second).status_code == 404
    assert c.get(PUBLIC + '/' + str(uuid4()), headers=first).status_code == 404
    assert c.get(PUBLIC, headers=second).json()['orders'] == []
    assert 'customer_id' not in detail.text and 'synthetic-sku' not in detail.text
    summary = c.get(PUBLIC, headers=first).json()['orders'][0]
    assert not {'shipping', 'lines', 'shipments', 'events', 'customer_id'} & summary.keys()
    assert store.catalog.get() == before
    for method in ['post', 'put', 'patch', 'delete']:
        assert getattr(c, method)(ADMIN + '/' + order_id, headers=AUTH).status_code == 405
    assert SalesOrderStore(store.catalog).detail(order_id, first_id) == body


def test_filter_before_paging_and_stable_ties(orders):
    c, store, first, second, first_id, second_id = orders
    expected = {add_order(store, first_id) for _ in range(5)}
    for _ in range(5): add_order(store, second_id, at='2026-11-02T00:00:00Z')
    add_order(store, first_id, status='cancelled')
    cursor = None
    found = []
    while True:
        params = {'limit': 2, 'status': 'confirmed'}
        if cursor: params['cursor'] = cursor
        page = c.get(PUBLIC, headers=first, params=params)
        assert page.status_code == 200, page.text
        found.extend(x['id'] for x in page.json()['orders'])
        cursor = page.json()['next_cursor']
        if not cursor: break
    assert found == sorted(expected, reverse=True)
    assert len(set(found)) == 5
    assert len(c.get(ADMIN, headers=AUTH).json()['orders']) == 11


@pytest.mark.parametrize('query', ['limit=0', 'limit=51', 'limit=no', 'status=not-real', 'cursor=garbage', 'cursor=' + 'a' * 1025])
def test_invalid_queries(orders, query):
    c, _, first, _, _, _ = orders
    assert c.get(PUBLIC + '?' + query, headers=first).status_code == 422


def test_constraints_and_backup(orders):
    _, store, _, _, first_id, _ = orders
    with store.catalog.transaction() as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 17
    add_order(store, first_id)
    backups = list(store.catalog.path.parent.glob('catalog.sqlite3.pre-sales-orders-*.bak'))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as db:
        assert db.execute("SELECT name FROM sqlite_master WHERE name='sales_orders'").fetchone() is None
    for values in [(-1, 0, -1), (100, 1, 102), (1.5, 0, 1.5)]:
        with pytest.raises(Exception) as error:
            with store.transaction() as db:
                db.execute('''INSERT INTO sales_orders(id,public_number,customer_id,created_at,status,payment_status,fulfillment_status,goods_total,shipping_total,grand_total,is_demo)
                    VALUES(?,?,?,'2026-11-01T00:00:00Z','confirmed','succeeded','unprepared',?,?,?,1)''', (str(uuid4()), str(uuid4()), first_id, *values))
        assert error.value.status_code == 503


def test_default_max_page_and_newer_insert_does_not_duplicate(orders):
    c, store, first, _, first_id, _ = orders
    ids = {add_order(store, first_id) for _ in range(51)}
    page = c.get(PUBLIC, headers=first).json()
    assert len(page['orders']) == 20 and page['next_cursor']
    add_order(store, first_id, at='2026-11-02T00:00:00Z')
    more = c.get(PUBLIC, headers=first, params={'cursor': page['next_cursor'], 'limit': 50}).json()
    assert {x['id'] for x in page['orders'] + more['orders']} == ids
    assert more['next_cursor'] is None
    assert len(c.get(PUBLIC, headers=first, params={'limit': 50}).json()['orders']) == 50
    assert c.get(PUBLIC, headers=first, params={'cursor': page['next_cursor'], 'status': 'confirmed'}).status_code == 422


def test_expired_session_and_unavailable_storage(orders, customer, monkeypatch):
    c, store, first, _, first_id, _ = orders
    add_order(store, first_id)
    customer[3][0] += 604800
    assert c.get(PUBLIC, headers=first).status_code == 401
    from fastapi import HTTPException
    with store.catalog.transaction() as db:
        db.execute('DROP TABLE sales_order_schema')
        db.execute('CREATE TABLE sales_order_schema(version INTEGER)')
        db.execute('INSERT INTO sales_order_schema VALUES(99)')
    assert c.get(ADMIN, headers=AUTH).status_code == 503


def test_demo_seed_requires_opt_in_new_separate_path(tmp_path):
    import importlib.util
    from pathlib import Path
    script = Path(__file__).resolve().parents[3] / 'scripts' / 'seed_sales_order_demo.py'
    spec = importlib.util.spec_from_file_location('sales_order_demo', script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    customer_id = str(uuid4())
    target = tmp_path / 'isolated.demo.sqlite3'
    with pytest.raises(ValueError): module.seed_demo(target, customer_id)
    assert not target.exists()
    with pytest.raises(ValueError): module.seed_demo(tmp_path / 'catalog.sqlite3', customer_id, demo=True)
    result = module.seed_demo(target, customer_id, demo=True)
    assert len(result['orders']) == 6
    store = SalesOrderStore(CatalogStore(target))
    assert len(store.list(customer_id)['orders']) == 6
    assert any(x['payment_status'] == 'unknown' for x in store.list(customer_id)['orders'])
    assert all(x['is_demo'] for x in store.list(customer_id)['orders'])
    assert store.catalog.get()['movements'] == []
    assert store.catalog.get()['products'] == []
    before = target.read_bytes()
    with pytest.raises(FileExistsError): module.seed_demo(target, customer_id, demo=True)
    assert target.read_bytes() == before


def test_admin_kst_date_boundaries_and_combined_filters(orders):
    c, store, _, _, owner, _ = orders
    before = add_order(store, owner, at='2026-10-31T14:59:59Z')
    start = add_order(store, owner, at='2026-10-31T15:00:00Z')
    end = add_order(store, owner, at='2026-11-01T14:59:59.999999Z')
    after = add_order(store, owner, at='2026-11-01T15:00:00Z')
    params = {'date_from': '2026-11-01', 'date_to': '2026-11-01'}
    response = c.get(ADMIN, headers=AUTH, params=params)
    assert response.status_code == 200, response.text
    assert {x['id'] for x in response.json()['orders']} == {start, end}
    with store.transaction() as db:
        db.execute("UPDATE sales_orders SET payment_status='unknown' WHERE id=?", (end,))
    combined = params | {'status': 'confirmed', 'payment_status': 'succeeded', 'fulfillment_status': 'partially_shipped', 'search_field': 'product', 'q': ' 티셔츠 '}
    assert [x['id'] for x in c.get(ADMIN, headers=AUTH, params=combined).json()['orders']] == [start]
    assert c.get(ADMIN, headers=AUTH, params=combined | {'fulfillment_status': 'delivered'}).json()['orders'] == []


@pytest.mark.parametrize('params', [
    {'date_from': '2026-02-30'}, {'date_to': '20261101'}, {'date_from': '2026-1-01'},
    {'date_from': '2026-11-02', 'date_to': '2026-11-01'}, {'date_to': '9999-12-31'},
    {'q': 'x' * 101}, {'search_field': 'address'}, {'payment_status': 'paid'}, {'fulfillment_status': 'sent'},
])
def test_admin_invalid_search(orders, params):
    assert orders[0].get(ADMIN, headers=AUTH, params=params).status_code == 422


def test_admin_literal_search_fields_phone_and_privacy(orders):
    c, store, first, _, owner, _ = orders
    target = add_order(store, owner, number="DEMO_%'--literal")
    add_order(store, owner, number='DEMO_OTHER')
    with store.transaction() as db:
        db.execute("UPDATE sales_order_shipping SET recipient=?,phone=? WHERE order_id=?", ('합성 특별 수령인', '010-1234 5678', target))
        db.execute("UPDATE sales_order_lines SET product_name=? WHERE order_id=?", ('100%_합성 의류', target))
    for field, q in [('number', "_%'--"), ('product', '%_'), ('recipient', '특별'), ('phone', '010 1234-5678'), ('all', '특별'), ('all', '01012345678'), ('all', "_%'--"), ('all', '%_')]:
        response = c.get(ADMIN, headers=AUTH, params={'search_field': field, 'q': q})
        assert [x['id'] for x in response.json()['orders']] == [target]
        assert '010-1234' not in response.text and '합성 특별 수령인' not in response.text
        assert 'customer_id' not in response.text
    for field, q in [('number', "' OR 1=1 --"), ('recipient', '%'), ('phone', '-')]:
        assert c.get(ADMIN, headers=AUTH, params={'search_field': field, 'q': q}).json()['orders'] == []
    assert len(c.get(ADMIN, headers=AUTH, params={'q': '   '}).json()['orders']) == 2
    assert c.get(ADMIN, params={'q': '특별'}).status_code == 401
    assert c.get(ADMIN, headers=first, params={'q': '특별'}).status_code == 401
    assert c.get(ADMIN, headers=AUTH, params={'q': 'x' * 100}).status_code == 200
    assert c.get(ADMIN, headers=AUTH, params={'q': '  ' + 'x' * 100 + '  '}).status_code == 200


def test_admin_search_cursor_bound_to_all_filters(orders):
    import base64
    c, store, first, _, owner, _ = orders
    for _ in range(3): add_order(store, owner)
    params = {'limit': 1, 'q': '합성 수령인', 'search_field': 'recipient', 'status': 'confirmed', 'payment_status': 'succeeded', 'fulfillment_status': 'partially_shipped', 'date_from': '2026-11-01', 'date_to': '2026-11-01'}
    first_page = c.get(ADMIN, headers=AUTH, params=params).json()
    cursor = first_page['next_cursor']
    assert cursor
    assert '합성 수령인'.encode() not in base64.urlsafe_b64decode(cursor + '=' * (-len(cursor) % 4))
    next_page = c.get(ADMIN, headers=AUTH, params=params | {'cursor': cursor})
    assert next_page.status_code == 200
    assert next_page.json()['orders'][0]['id'] != first_page['orders'][0]['id']
    assert c.get(ADMIN, headers=AUTH, params=params | {'cursor': cursor, 'q': '  합성 수령인  '}).status_code == 200
    for patch in [{'q': '수령인'}, {'search_field': 'all'}, {'status': 'closed'}, {'payment_status': 'unknown'}, {'fulfillment_status': 'delivered'}, {'date_from': '2026-10-31'}, {'date_to': '2026-11-02'}]:
        assert c.get(ADMIN, headers=AUTH, params=params | {'cursor': cursor} | patch).status_code == 422
    # Customer cursors keep their original status-only contract.
    old_cursor = c.get(PUBLIC, headers=first, params={'limit': 1}).json()['next_cursor']
    assert c.get(PUBLIC, headers=first, params={'cursor': old_cursor}).status_code == 200


def test_admin_date_offset_and_phone_whitespace(orders):
    c, store, _, _, owner, _ = orders
    order_id = add_order(store, owner, at='2026-11-01T00:00:00+09:00')
    with store.transaction() as db:
        db.execute('UPDATE sales_order_shipping SET phone=? WHERE order_id=?', ('010\t1234\n5678', order_id))
    response = c.get(ADMIN, headers=AUTH, params={'date_from': '2026-11-01', 'date_to': '2026-11-01', 'search_field': 'phone', 'q': '010-1234 5678'})
    assert [x['id'] for x in response.json()['orders']] == [order_id]
    assert c.get(ADMIN, headers=AUTH, params={'date_to': '2026-10-31'}).json()['orders'] == []

def test_customer_filters_keep_owner_and_cursor_boundaries(orders):
    c, store, first, second, owner, other = orders
    own = add_order(store, owner)
    add_order(store, owner, at='2026-10-01T00:00:00Z')
    add_order(store, other)
    params = {'date_from':'2026-11-01','date_to':'2026-11-01','payment_status':'succeeded','fulfillment_status':'partially_shipped','status':'confirmed'}
    response = c.get(PUBLIC, headers=first, params=params)
    assert response.status_code == 200
    assert [x['id'] for x in response.json()['orders']] == [own]
    assert c.get(PUBLIC, params=params).status_code == 401
    assert c.get(PUBLIC, headers=first, params=params | {'fulfillment_status':'delivered'}).json()['orders'] == []
    add_order(store, owner)
    cursor = c.get(PUBLIC, headers=first, params=params | {'limit':1}).json()['next_cursor']
    assert cursor
    assert c.get(PUBLIC, headers=first, params=params | {'cursor':cursor}).status_code == 200
    assert c.get(PUBLIC, headers=first, params=params | {'cursor':cursor,'date_from':'2026-10-01'}).status_code == 422
    assert c.get(PUBLIC, headers=first, params={'date_from':'2026-11-02','date_to':'2026-11-01'}).status_code == 422
    assert c.get(PUBLIC, headers=first, params={'payment_status':'invalid'}).status_code == 422

def test_customer_product_search_owner_literal_and_cursor(orders):
    c, store, first, _, owner, other = orders
    wanted=add_order(store, owner)
    add_order(store, other)
    with store.transaction() as db:
        db.execute('UPDATE sales_order_lines SET product_name=? WHERE order_id=?', ('고유 100%_티셔츠',wanted))
    assert [r['id'] for r in c.get(PUBLIC,headers=first,params={'q':' 100%_ '}).json()['orders']]==[wanted]
    assert c.get(PUBLIC,headers=first,params={'q':'합성 수령인'}).json()['orders']==[]
    assert c.get(PUBLIC,headers=first,params={'q':'x'*101}).status_code==422
    assert c.get(PUBLIC,params={'q':'티셔츠'}).status_code==401
    add_order(store,owner)
    cursor=c.get(PUBLIC,headers=first,params={'q':'티셔츠','limit':1}).json()['next_cursor']
    assert cursor
    assert c.get(PUBLIC,headers=first,params={'q':'티셔츠','cursor':cursor}).status_code==200
    assert c.get(PUBLIC,headers=first,params={'q':'고유','cursor':cursor}).status_code==422
