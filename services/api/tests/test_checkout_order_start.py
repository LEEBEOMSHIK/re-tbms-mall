import sqlite3
from uuid import uuid4

from test_checkout import SHIP, setup_checkout
from test_customer import P, customer, login
from test_inventory import AUTH, BASE, movement, post_move
from test_public_catalog import publish


def start_case(customer):
    client, auth, product, sku, selection = setup_checkout(customer)
    selection['quantity'] = 4
    draft = client.post(P + '/checkouts', headers=auth, json=selection).json()
    body = {'request_id': str(uuid4()), 'version': 0, 'shipping': SHIP,
            'expected_lines': {sku['id']: 12000}, 'expected_goods_total': 48000, 'expected_shipping_total': 3000}
    return client, auth, product, sku['id'], P + '/checkouts/' + draft['id'] + '/payment', body


def test_readiness_ownership_and_unverified_shipping_never_create_orders(customer):
    from app.checkout import payment_delivery_verifier

    client, auth, _, _, url, body = start_case(customer)
    assert client.post(url, json=body).status_code == 401
    assert client.post(url, headers=login(client, 'kakao'), json=body).status_code == 404
    assert client.post(url, headers=auth, json=body).status_code == 503
    client.app.dependency_overrides[payment_delivery_verifier] = lambda: lambda address: False
    assert client.post(url, headers=auth, json=body).status_code == 409
    client.app.dependency_overrides[payment_delivery_verifier] = lambda: lambda address: True
    restricted = SHIP | {'postal_code': '63000'}
    assert client.post(url, headers=auth, json=body | {'shipping': restricted}).status_code == 409
    assert client.post(url, headers=auth, json=body | {'payment_status': 'succeeded'}).status_code == 422
    with sqlite3.connect(customer[1].with_name('catalog.sqlite3')) as db:
        assert not db.execute("SELECT 1 FROM sqlite_master WHERE name IN ('order_reservations', 'sales_orders')").fetchone()


def test_verified_start_reprice_retry_and_consumer_availability(customer):
    from app.checkout import payment_delivery_verifier

    client, auth, product, sku, url, body = start_case(customer)
    client.app.dependency_overrides[payment_delivery_verifier] = lambda: lambda address: address == SHIP
    assert publish(client, product, 1, price=13000).status_code == 200
    assert client.post(url, headers=auth, json=body).status_code == 409
    body.update(expected_lines={sku: 13000}, expected_goods_total=52000, expected_shipping_total=0)
    started = client.post(url, headers=auth, json=body)
    assert started.status_code == 200, started.text
    order = started.json()
    assert order['status'] == 'awaiting_payment' and order['grand_total'] == 52000
    replay = client.post(url, headers=auth, json=body).json()
    saved = client.get(P + '/sales-orders/' + order['id'], headers=auth).json()
    for record in (order, replay, saved):
        assert record['reservation'].pop('server_now')
    assert order == replay == saved
    assert client.get('/api/v1/products/' + product).json()['sold_out']
    draft = client.get(url.removesuffix('/payment'), headers=auth).json()
    assert draft['has_unavailable'] and draft['items'][0]['available_quantity'] == 0
    physical = client.get(BASE + '/catalog', headers=AUTH).json()['skus'][0]
    assert physical['on_hand'] == 4
    assert post_move(client, movement(sku, -1, physical['version'])).status_code == 409
