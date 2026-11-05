from uuid import uuid4

import pytest

from app.checkout import payment_delivery_verifier
from test_checkout import SHIP, setup_checkout
from test_customer import P, customer, login
from test_inventory import AUTH, BASE, movement, post_move, product

CART = P + '/cart'


def mutation(version, **fields):
    return {'request_id': str(uuid4()), 'version': version, **fields}


def make_option(client, product_id, source, stock):
    size = client.post(BASE + '/option-values', headers=AUTH, json={
        'kind': 'size', 'name': 'Large' + product_id[:4], 'code': 'L' + product_id[:4].upper(),
        'is_active': True, 'sort_order': 1})
    assert size.status_code == 201, size.text
    sku = client.post(BASE + '/skus', headers=AUTH, json={
        'product_id': product_id, 'color_id': source['color_id'], 'size_id': size.json()['id'], 'reorder_point': 0})
    assert sku.status_code == 201, sku.text
    target = sku.json()['id']
    assert post_move(client, movement(target, stock)).status_code == 200
    return target


@pytest.fixture
def pair(customer):
    client, auth, pid, source, _ = setup_checkout(customer)
    target = make_option(client, pid, source, 110)
    for version, sku in enumerate((source['id'], target)):
        assert client.put(CART + '/items/' + sku, headers=auth, json=mutation(version, quantity=2)).status_code == 200
    return client, auth, source['id'], target


def test_remove_selection_is_atomic_scoped_and_idempotent(pair):
    client, auth, source, target = pair
    url = CART + '/remove-selection'
    body = mutation(2, sku_ids=[source, target])
    assert client.post(url, json=body).status_code == 401
    assert client.post(url, headers=login(client, 'kakao'), json=body | {'version': 0}).status_code == 409
    for ids, status in [([], 422), ([source, source], 422), ([source, 'missing'], 409), (['x'] * 101, 422)]:
        assert client.post(url, headers=auth, json=body | {'sku_ids': ids}).status_code == status
    assert client.get(CART, headers=auth).json()['version'] == 2
    assert client.post(url, headers=auth, json=body | {'version': 1}).status_code == 409
    for _ in range(2):
        removed = client.post(url, headers=auth, json=body)
        assert removed.status_code == 200
        assert removed.json()['version'] == 3 and removed.json()['items'] == []
    assert client.post(url, headers=auth, json=body | {'sku_ids': [source]}).status_code == 409


def test_change_option_merges_and_rolls_back(pair):
    client, auth, source, target = pair
    url = CART + '/change-option'
    body = mutation(2, sku_id=source, target_sku_id=target)
    assert client.post(url, json=body).status_code == 401
    assert client.post(url, headers=login(client, 'kakao'), json=body | {'version': 0}).status_code == 409
    for invalid in ('missing', source):
        assert client.post(url, headers=auth, json=body | {'target_sku_id': invalid}).status_code == 409
    other = product(client)['id']
    source_option = next(i for i in client.get(BASE + '/catalog', headers=AUTH).json()['skus'] if i['id'] == source)
    other_sku = make_option(client, other, source_option, 100)
    assert client.post(url, headers=auth, json=body | {'target_sku_id': other_sku}).status_code == 409
    # The source has four units on hand. A merged quantity of five must fail.
    assert client.put(CART + '/items/' + target, headers=auth, json=mutation(2, quantity=3)).status_code == 200
    assert client.post(url, headers=auth, json=body | {'version': 3, 'sku_id': target, 'target_sku_id': source}).status_code == 409
    assert client.put(CART + '/items/' + target, headers=auth, json=mutation(3, quantity=98)).status_code == 200
    assert client.post(url, headers=auth, json=body | {'version': 4}).status_code == 409
    assert client.put(CART + '/items/' + target, headers=auth, json=mutation(4, quantity=97)).status_code == 200
    assert client.post(url, headers=auth, json=body).status_code == 409
    for _ in range(2):
        changed = client.post(url, headers=auth, json=body | {'version': 5})
        assert changed.status_code == 200, changed.text
        assert [(i['sku_id'], i['quantity']) for i in changed.json()['items']] == [(target, 99)]
        assert changed.json()['version'] == 6
    assert client.post(url, headers=auth, json=body | {'version': 6}).status_code == 409


def test_checkout_subset_validates_membership_and_reserves_only_selection(pair):
    client, auth, source, target = pair
    assert client.get(CART, headers=auth).json()['shipping_policy'] == {'base_fee': 3000, 'free_threshold': 50000}
    url = P + '/checkouts'
    body = {'source': 'cart', 'cart_version': 2, 'request_id': str(uuid4()), 'sku_ids': [source]}
    for ids, status in [(None, 422), ([], 422), ([source, source], 422), ([source, 'missing'], 409)]:
        assert client.post(url, headers=auth, json=body | {'sku_ids': ids}).status_code == status
    assert client.post(url, headers=login(client, 'kakao'), json=body | {'cart_version': 0}).status_code == 409
    # An unavailable, unselected line must neither block checkout nor disappear from the cart.
    assert post_move(client, movement(target, -110, 1)).status_code == 200
    draft = client.post(url, headers=auth, json=body)
    assert draft.status_code == 200, draft.text
    data = draft.json()
    assert [i['sku_id'] for i in data['items']] == [source] and data['total'] == 24000
    assert client.post(url, headers=auth, json=body).json()['id'] == data['id']
    assert client.post(url, headers=auth, json=body | {'sku_ids': [target]}).status_code == 409
    assert client.post(url, headers=auth, json=body | {'source': 'direct', 'sku_id': source, 'quantity': 1, 'cart_version': None}).status_code == 422
    client.app.dependency_overrides[payment_delivery_verifier] = lambda: lambda address: True
    paid = client.post(url + '/' + data['id'] + '/payment', headers=auth, json=mutation(
        0, shipping=SHIP, expected_lines={source: 12000}, expected_goods_total=24000, expected_shipping_total=3000))
    assert paid.status_code == 200, paid.text
    assert [(i['quantity'], i['line_total']) for i in paid.json()['lines']] == [(2, 24000)]
    cart = client.get(CART, headers=auth).json()
    assert [i['sku_id'] for i in cart['items']] == [source, target] and cart['version'] == 2
    assert cart['items'][0]['available_quantity'] == 2
