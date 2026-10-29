from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import pytest
from test_movement_reasons import setup

AUTH = {'Authorization': 'Bearer reason-test-only'}

@pytest.mark.parametrize('value', [0, 1_000_000])
def test_reorder_point_changes_only_threshold_and_version(setup, value):
    store, sku, client = setup
    movement = client.post('/api/v1/admin/inventory/movements', headers=AUTH, json={'sku_id': sku['id'], 'delta': 5, 'reason_code': 'receipt', 'version': 0, 'request_id': str(uuid4())})
    assert movement.status_code == 200
    before = store.get()
    url = f"/api/v1/admin/skus/{sku['id']}/reorder-point"
    result = client.put(url, headers=AUTH, json={'reorder_point': value, 'version': 1})
    assert result.status_code == 200
    updated = result.json()
    original = before['skus'][0]
    assert updated == {**original, 'reorder_point': value, 'version': 2}
    after = store.get()
    assert after == {**before, 'skus': [updated]}
    same = client.put(url, headers=AUTH, json={'reorder_point': value, 'version': 2})
    assert same.status_code == 200 and same.json()['version'] == 3
    assert client.put(url, headers=AUTH, json={'reorder_point': value, 'version': 2}).status_code == 409
    assert store.get()['movements'] == before['movements']

@pytest.mark.parametrize('body', [
    {'reorder_point': -1, 'version': 0}, {'reorder_point': 1_000_001, 'version': 0},
    {'reorder_point': True, 'version': 0}, {'reorder_point': '2', 'version': 0},
    {'reorder_point': 1.5, 'version': 0}, {'reorder_point': None, 'version': 0},
    {'reorder_point': 1}, {'reorder_point': 1, 'version': -1},
    {'reorder_point': 1, 'version': True}, {'reorder_point': 1, 'version': 2_147_483_648},
    {'reorder_point': 1, 'version': 0, 'on_hand': 100},
])
def test_invalid_threshold_body_does_not_write(setup, body):
    store, sku, client = setup
    before = store.get()
    assert client.put(f"/api/v1/admin/skus/{sku['id']}/reorder-point", headers=AUTH, json=body).status_code == 422
    assert store.get() == before


def test_threshold_auth_missing_and_stale(setup):
    store, sku, client = setup
    url = f"/api/v1/admin/skus/{sku['id']}/reorder-point"
    body = {'reorder_point': 3, 'version': 0}
    before = store.get()
    assert client.put(url, json=body).status_code == 401
    assert client.put(url, headers={'Authorization': 'Bearer incorrect'}, json=body).status_code == 401
    assert client.put('/api/v1/admin/skus/missing/reorder-point', headers=AUTH, json=body).status_code == 404
    assert client.put(url, headers=AUTH, json={**body, 'version': 1}).status_code == 409
    assert store.get() == before


def test_concurrent_threshold_updates_commit_once(setup):
    store, sku, client = setup
    url = f"/api/v1/admin/skus/{sku['id']}/reorder-point"
    def update(value):
        return client.put(url, headers=AUTH, json={'reorder_point': value, 'version': 0}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(update, [2, 7]))
    assert sorted(outcomes) == [200, 409]
    data = store.get()
    assert data['skus'][0]['version'] == 1
    assert data['skus'][0]['reorder_point'] in (2, 7)
    assert data['skus'][0]['on_hand'] == sku['on_hand'] and data['movements'] == []

def test_threshold_update_and_stock_movement_share_version(setup):
    store, sku, client = setup
    result = client.put(f"/api/v1/admin/skus/{sku['id']}/reorder-point", headers=AUTH, json={'reorder_point': 4, 'version': 0})
    assert result.status_code == 200
    body = {'sku_id': sku['id'], 'delta': 3, 'reason_code': 'receipt', 'version': 0, 'request_id': str(uuid4())}
    assert client.post('/api/v1/admin/inventory/movements', headers=AUTH, json=body).status_code == 409
    assert client.post('/api/v1/admin/inventory/movements', headers=AUTH, json={**body, 'version': 1}).status_code == 200
    current = store.get()
    assert current['skus'][0]['reorder_point'] == 4
    assert current['skus'][0]['on_hand'] == 3 and len(current['movements']) == 1
