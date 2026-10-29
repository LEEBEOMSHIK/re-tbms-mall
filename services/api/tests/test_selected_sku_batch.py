from concurrent.futures import ThreadPoolExecutor
import sqlite3
from threading import Barrier

from fastapi import HTTPException
import pytest

from app.inventory import CatalogStore, SelectedSkuBatchCreate, MovementCreate, ProductCreate
from test_sku_batch import setup


def selected(body, stocks=(3, 0)):
    return SelectedSkuBatchCreate(product_id=body.product_id, reorder_point=5, items=[
        {'color_id': body.color_ids[0], 'size_id': body.size_ids[0], 'initial_stock': stocks[0]},
        {'color_id': body.color_ids[1], 'size_id': body.size_ids[1], 'initial_stock': stocks[1]},
    ])


def test_selected_initial_stock_zero_excluded_and_retry(setup):
    store, body, _ = setup
    request = selected(body)
    result = store.create_selected_sku_batch(request)
    assert len(result['created']) == 2 and result['existing'] == []
    assert [(r['on_hand'], r['version']) for r in result['created']] == [(3, 1), (0, 0)]
    data = store.get()
    assert len(data['skus']) == 2  # Off-diagonal combinations were excluded.
    assert len(data['movements']) == 1
    event = data['movements'][0]
    assert event['delta'] == event['balance_after'] == 3
    assert event['reason'] == '옵션 등록 시 초기 입고' and event['actor'] == 'local-admin'
    assert store.move(MovementCreate(sku_id=event['sku_id'], version=0, delta=3, reason=event['reason'], reason_code='receipt', request_id=event['request_id'])) == event
    retry = store.create_selected_sku_batch(selected(body, (99, 99)))
    assert retry['created'] == [] and retry['existing'] == result['created']
    assert store.get() == data


@pytest.mark.parametrize('items', [[], [{'color_id': 'c', 'size_id': 's', 'initial_stock': x} for x in [0, 1]],
    [{'color_id': 'c', 'size_id': str(i), 'initial_stock': 0} for i in range(51)],
    [{'color_id': str(i), 'size_id': 's', 'initial_stock': 0} for i in range(51)],
    [{'color_id': str(i), 'size_id': str(j), 'initial_stock': 0} for i in range(15) for j in range(15)],
])
def test_item_bounds(items):
    with pytest.raises(ValueError):
        SelectedSkuBatchCreate(product_id='p', items=items, reorder_point=0)


@pytest.mark.parametrize('stock', [-1, 1000001, True, 1.5, '1'])
def test_stock_strict_bounds(setup, stock):
    store, body, client = setup
    request = selected(body).model_dump(exclude_none=True)
    request['items'][0]['initial_stock'] = stock
    assert client.post('/api/v1/admin/skus/selected-batch', headers={'Authorization': 'Bearer batch-test-only'}, json=request).status_code == 422
    assert store.get()['skus'] == []


def test_auth_and_upper_stock_boundary(setup):
    store, body, client = setup
    request = selected(body, (1000000, 0)).model_dump(exclude_none=True)
    url = '/api/v1/admin/skus/selected-batch'
    assert client.post(url, json=request).status_code == 401
    assert client.post(url, headers={'Authorization': 'Bearer bad'}, json=request).status_code == 401
    response = client.post(url, headers={'Authorization': 'Bearer batch-test-only'}, json=request)
    assert response.status_code == 200
    assert response.json()['created'][0]['on_hand'] == 1000000
    assert len(store.get()['movements']) == 1


@pytest.mark.parametrize('failure', ['ledger', 'collision', 'missing'])
def test_selected_batch_atomic_rollback(setup, failure):
    store, body, _ = setup
    request = selected(body, (2, 4))
    if failure == 'ledger':
        with sqlite3.connect(store.path) as db:
            db.execute("CREATE TRIGGER fail_second BEFORE INSERT ON movements WHEN NEW.delta=4 BEGIN SELECT RAISE(ABORT,'test'); END")
    elif failure == 'collision':
        other = store.create_product(ProductCreate(name='Other', category_id='tops-tee', seasons=['SP']))
        other_request = SelectedSkuBatchCreate(**{**request.model_dump(exclude_none=True), 'product_id': other['id']})
        foreign = store.create_selected_sku_batch(other_request)['created'][0]
        internal = next(p['internal_name'] for p in store.get()['products'] if p['id'] == body.product_id)
        collision = internal + '-C1-S1'
        with sqlite3.connect(store.path) as db:
            db.execute('UPDATE skus SET code=?,code_key=? WHERE id=?', (collision, collision.casefold(), foreign['id']))
    else:
        request.items[1].size_id = 'missing'
    before = store.get()
    with pytest.raises(HTTPException) as error:
        store.create_selected_sku_batch(request)
    assert error.value.status_code == {'ledger': 503, 'collision': 409, 'missing': 404}[failure]
    assert store.get() == before


def test_concurrent_retry_cannot_double_receive(setup):
    store, body, _ = setup
    request = selected(body, (5, 7))
    request.items[0].reorder_point = 0
    request.items[1].reorder_point = 17
    gate = Barrier(2)
    def attempt(_):
        gate.wait(timeout=5)
        return CatalogStore(store.path).create_selected_sku_batch(request)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, range(2)))
    assert sorted(len(r['created']) for r in results) == [0, 2]
    assert sorted(len(r['existing']) for r in results) == [0, 2]
    data = store.get()
    assert sorted(r['on_hand'] for r in data['skus']) == [5, 7]
    assert len(data['movements']) == 2
    assert sum(r['delta'] for r in data['movements']) == 12
    assert sorted(r['reorder_point'] for r in data['skus']) == [0, 17]


def test_per_item_reorder_zero_override_default_and_existing_unchanged(setup):
    store, body, client = setup
    request = selected(body).model_dump(exclude_none=True)
    request.pop('reorder_point')
    request['items'][0]['reorder_point'] = 0
    request['items'][1]['reorder_point'] = 9
    response = client.post('/api/v1/admin/skus/selected-batch', headers={'Authorization': 'Bearer batch-test-only'}, json=request)
    assert response.status_code == 200
    assert [s['reorder_point'] for s in response.json()['created']] == [0, 9]
    before = store.get()
    for item in request['items']:
        item['reorder_point'] = 99
        item['initial_stock'] = 99
    retry = store.create_selected_sku_batch(SelectedSkuBatchCreate(**request))
    assert retry['created'] == []
    assert store.get() == before


def test_top_level_fallback_and_explicit_zero(setup):
    store, body, _ = setup
    request = selected(body)
    request.items[0].reorder_point = 0
    result = store.create_selected_sku_batch(request)
    assert [s['reorder_point'] for s in result['created']] == [0, 5]
    without_top = selected(body).model_dump(exclude_none=True)
    without_top.pop('reorder_point')
    parsed = SelectedSkuBatchCreate(**without_top)
    assert parsed.reorder_point == 0 and parsed.items[1].reorder_point is None


@pytest.mark.parametrize('value', [None, -1, 1000001, True, 2.5, '2'])
def test_item_reorder_strict_bounds(setup, value):
    store, body, client = setup
    request = selected(body).model_dump(exclude_none=True)
    request['items'][1]['reorder_point'] = value
    assert client.post('/api/v1/admin/skus/selected-batch', headers={'Authorization': 'Bearer batch-test-only'}, json=request).status_code == 422
    assert store.get()['skus'] == []
