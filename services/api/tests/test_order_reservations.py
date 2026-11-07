"""WB162 domain invariants using isolated catalog/customer SQLite fixtures."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import json
import time
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.customer import CustomerStore
from app.inventory import CatalogStore
from app.order_reservations import held_quantity, reserve_order
from app.sales_orders import SalesOrderStore
from test_checkout import SHIP, setup_checkout
from test_customer import customer


@pytest.fixture
def engine(customer, tmp_path):
    client, _, _, sku, _ = setup_checkout(customer)
    catalog = CatalogStore(tmp_path / 'catalog.sqlite3')
    customers = CustomerStore(customer[1], catalog)
    now = [int(time.time())]
    orders = SalesOrderStore(catalog, clock=lambda: now[0])
    def start(draft, key, **changes):
        args = {'draft': draft, 'customer_id': draft['customer_id'], 'version': 3,
                'request_id': key, 'shipping': SHIP, 'expected_goods_total': 48000,
                'expected_shipping_total': 3000, 'expected_lines': {sku['id']: 12000}}
        with orders.transaction() as db:
            return reserve_order(orders, db, customers, **(args | changes))
    def draft():
        return {'id': str(uuid4()), 'customer_id': str(uuid4()), 'version': 3,
                'items': json.dumps([{'sku_id': sku['id'], 'quantity': 4}])}
    return orders, now, sku, start, draft


def test_snapshot_idempotency_and_expiry_boundary(engine):
    orders, now, sku, start, make = engine
    draft, key = make(), str(uuid4())
    first = start(draft, key)
    assert first['lines'][0]['unit_price'] == 12000 and first['grand_total'] == 51000
    assert first['status'] == 'awaiting_payment' and first['payment_status'] == 'pending'
    assert first['shipping'] == SHIP and first['is_demo'] is False
    hold = first['reservation']
    assert (datetime.fromisoformat(hold['expires_at']) - datetime.fromisoformat(hold['server_now'])).total_seconds() == 600
    assert start(draft | {'version': 4}, key) == first
    for kwargs in ({'expected_lines': {sku['id']: 100}}, {'shipping': SHIP | {'memo': 'changed'}}):
        with pytest.raises(HTTPException, match='409'):
            start(draft, key, **kwargs)
    with pytest.raises(HTTPException, match='409'):
        start(draft, str(uuid4()))
    now[0] += 599.999
    assert orders.detail(first['id'])['reservation']['status'] == 'held'
    now[0] += .001
    assert orders.list(status='expired')['orders'][0]['id'] == first['id']
    expired = start(draft, key)
    assert expired['status'] == 'expired' and expired['reservation']['status'] == 'released'
    assert expired['number'] == first['number'] and len(expired['events']) == 2
    assert start(draft, str(uuid4()))['number'] != first['number']


def test_last_units_serialize_between_customers(engine):
    orders, now, sku, start, make = engine
    def compete(_):
        try:
            return start(make(), str(uuid4()))['id']
        except HTTPException as error:
            assert error.status_code == 409
            return None
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sum(bool(result) for result in pool.map(compete, range(2))) == 1
    with orders.transaction() as db:
        assert held_quantity(db, sku['id'], now[0]) == 4
        assert db.execute('SELECT on_hand FROM skus WHERE id=?', (sku['id'],)).fetchone()[0] == 4
        assert db.execute('SELECT COUNT(*) FROM sales_order_number_allocations').fetchone()[0] == 1


def test_unknown_payment_remains_held_after_deadline(engine):
    orders, now, sku, start, make = engine
    first = start(make(), str(uuid4()))
    with orders.transaction() as db:
        db.execute("UPDATE sales_orders SET payment_status='unknown' WHERE id=?", (first['id'],))
    now[0] += 3600
    assert orders.detail(first['id'])['reservation']['status'] == 'held'
    with orders.transaction() as db:
        assert held_quantity(db, sku['id'], now[0]) == 4
    with pytest.raises(HTTPException, match='409'):
        start(make(), str(uuid4()))


def test_snapshot_guards_and_late_write_rollback(engine):
    orders, _, sku, start, make = engine
    draft = make()
    for kwargs, status in [({'customer_id': str(uuid4())}, 404), ({'version': 2}, 409),
                           ({'expected_goods_total': 2}, 409), ({'expected_shipping_total': 0}, 409),
                           ({'expected_lines': {sku['id']: 1}}, 409)]:
        with pytest.raises(HTTPException) as failure:
            start(draft, str(uuid4()), **kwargs)
        assert failure.value.status_code == status
    selection = json.loads(draft['items']) + [{'sku_id': 'unavailable', 'quantity': 1}]
    with pytest.raises(HTTPException, match='409'):
        start(draft | {'items': json.dumps(selection)}, str(uuid4()))
    with orders.transaction() as db:
        db.execute("""CREATE TRIGGER simulate_failure BEFORE INSERT ON sales_order_events
            BEGIN SELECT RAISE(ABORT,'synthetic late failure'); END""")
    key = str(uuid4())
    with pytest.raises(HTTPException, match='503'):
        start(draft, key)
    with orders.transaction() as db:
        for table in ['sales_orders', 'sales_order_lines', 'sales_order_shipping']:
            assert db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0] == 0
        assert not db.execute("SELECT 1 FROM sqlite_master WHERE name IN ('order_reservations','sales_order_number_allocations')").fetchone()
        db.execute('DROP TRIGGER simulate_failure')
    assert start(draft, key)['reservation']['status'] == 'held'


def test_concurrent_replays_and_immutable_snapshot(engine):
    orders, _, sku, start, make = engine
    draft, key = make(), str(uuid4())
    with ThreadPoolExecutor(max_workers=2) as pool:
        attempts = list(pool.map(lambda _: start(draft, key), range(2)))
    assert attempts[0] == attempts[1]
    with orders.transaction() as db:
        db.execute('UPDATE product_publications SET price=100 WHERE product_id=?', (sku['product_id'],))
        db.execute('UPDATE skus SET is_active=0 WHERE id=?', (sku['id'],))
    assert start(draft, key)['lines'] == attempts[0]['lines']
    assert orders.detail(attempts[0]['id'])['goods_total'] == 48000


@pytest.mark.parametrize('delta,status,reason', [
    (599.999, 'cancelled', 'customer_cancelled'), (600, 'expired', 'expired'), (601, 'expired', 'expired')])
def test_cancel_at_server_deadline_and_get_race(engine, delta, status, reason):
    from app.order_reservations import cancel_order
    orders, now, sku, start, make = engine
    draft = make()
    order = start(draft, str(uuid4()))
    assert order['can_cancel']
    key = str(uuid4())
    now[0] += delta
    def cancel():
        return cancel_order(orders, order['id'], draft['customer_id'], key)
    with ThreadPoolExecutor(max_workers=3) as pool:
        calls = [pool.submit(cancel), pool.submit(orders.detail, order['id']), pool.submit(cancel)]
        first, _, second = [call.result() for call in calls]
    assert first == second and first['status'] == status and first['payment_status'] == 'cancelled'
    assert not first['can_cancel'] and first['reservation']['release_reason'] == reason
    assert first['number'] == order['number'] and first['grand_total'] == order['grand_total']
    assert len(first['events']) == 2
    with orders.transaction() as db:
        assert held_quantity(db, sku['id'], now[0]) == 0
        assert db.execute('SELECT COUNT(*) FROM order_cancel_requests').fetchone()[0] == 1
        assert db.execute('SELECT on_hand FROM skus WHERE id=?', (sku['id'],)).fetchone()[0] == 4
    next_order = start(draft, str(uuid4()))
    with pytest.raises(HTTPException, match='409'):
        cancel_order(orders, next_order['id'], draft['customer_id'], key)
    assert orders.detail(next_order['id'])['can_cancel']


@pytest.mark.parametrize('column,value', [('payment_status','unknown'), ('payment_status','succeeded'),
                                            ('fulfillment_status','preparing'), ('status','confirmed')])
def test_unsafe_transitions_keep_hold_even_after_deadline(engine, column, value):
    from app.order_reservations import cancel_order
    orders, now, sku, start, make = engine
    draft = make()
    order = start(draft, str(uuid4()))
    with orders.transaction() as db:
        db.execute(f'UPDATE sales_orders SET {column}=? WHERE id=?', (value, order['id']))
    for elapsed in [0, 600]:
        now[0] += elapsed
        with pytest.raises(HTTPException, match='409'):
            cancel_order(orders, order['id'], draft['customer_id'], str(uuid4()))
        assert not orders.detail(order['id'])['can_cancel']
        with orders.transaction() as db:
            assert held_quantity(db, sku['id'], now[0]) == 4


def test_authenticated_cancel_endpoint(engine, customer):
    from test_customer import login
    client = customer[0]
    owner = login(client)
    other = login(client, 'kakao')
    customer_id = client.get('/api/v1/customer/me', headers=owner).json()['customer']['id']
    _, _, _, start, make = engine
    draft = make() | {'customer_id': customer_id}
    order = start(draft, str(uuid4()))
    url = '/api/v1/customer/sales-orders/' + order['id'] + '/cancel'
    payload = {'request_id': str(uuid4())}
    assert client.post(url, json=payload).status_code == 401
    assert client.post(url, json=payload, headers=other).status_code == 404
    for body in [{'request_id': 'invalid'}, payload | {'customer_id': customer_id}, {}]:
        assert client.post(url, json=body, headers=owner).status_code == 422
    response = client.post(url, json=payload, headers=owner)
    assert response.status_code == 200 and response.headers['cache-control'] == 'no-store'
    assert response.json()['reservation']['release_reason'] == 'customer_cancelled'
    repeated = client.post(url, json={'request_id': str(uuid4())}, headers=owner)
    assert repeated.status_code == 200 and repeated.json()['events'] == response.json()['events']


def test_unattributed_cancellation_is_not_a_customer_receipt(engine):
    from app.order_reservations import cancel_order
    orders, _, _, start, make = engine
    draft = make()
    order = start(draft, str(uuid4()))
    with orders.transaction() as db:
        db.execute("UPDATE order_reservations SET status='released' WHERE order_id=?", (order['id'],))
        db.execute("UPDATE sales_orders SET status='cancelled',payment_status='cancelled' WHERE id=?", (order['id'],))
    assert 'release_reason' not in orders.detail(order['id'])['reservation']
    with pytest.raises(HTTPException, match='409'):
        cancel_order(orders, order['id'], draft['customer_id'], str(uuid4()))


def test_admin_catalog_availability_snapshot(engine, monkeypatch):
    from app.order_reservations import cancel_order
    orders, now, sku, start, make = engine
    monkeypatch.setattr('app.order_reservations.time.time', lambda: now[0])
    def snapshot():
        row = next(s for s in orders.catalog.get()['skus'] if s['id'] == sku['id'])
        return row['on_hand'], row['reserved_quantity'], row['available_quantity']
    assert snapshot() == (4, 0, 4)
    draft = make()
    first = start(draft, str(uuid4()))
    assert snapshot() == (4, 4, 0)
    now[0] += 599.999
    assert snapshot() == (4, 4, 0)
    now[0] += .001
    assert snapshot() == (4, 0, 4)  # no expiration job or order read needed
    second = start(draft, str(uuid4()))
    cancel_order(orders, second['id'], draft['customer_id'], str(uuid4()))
    assert snapshot() == (4, 0, 4)
    third = start(make(), str(uuid4()))
    with orders.transaction() as db:
        db.execute("UPDATE sales_orders SET payment_status='unknown' WHERE id=?", (third['id'],))
    now[0] += 601
    assert snapshot() == (4, 4, 0)
