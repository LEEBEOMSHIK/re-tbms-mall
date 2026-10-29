from uuid import uuid4

import pytest

from test_movement_reasons import setup


@pytest.mark.parametrize('reason', [None, '', '   ', 'x' * 300])
def test_optional_details_normalized_and_replay_safe(setup, reason):
    store, sku, client = setup
    body = {'sku_id': sku['id'], 'version': 0, 'delta': 2, 'reason_code': 'receipt', 'request_id': str(uuid4())}
    if reason is not None:  # None here denotes omitted input, tested separately from explicit null.
        body['reason'] = reason
    url = '/api/v1/admin/inventory/movements'
    auth = {'Authorization': 'Bearer reason-test-only'}
    response = client.post(url, headers=auth, json=body)
    assert response.status_code == 200
    expected = (reason or '').strip()
    assert response.json()['reason'] == expected
    assert client.post(url, headers=auth, json={**body, 'reason': expected}).json() == response.json()
    data = store.get()
    assert len(data['movements']) == 1
    assert data['skus'][0]['on_hand'] == 2 and data['skus'][0]['version'] == 1
    assert client.post(url, headers=auth, json={**body, 'reason': 'Changed details'}).status_code == 409


@pytest.mark.parametrize('reason', [None, 'x' * 301])
def test_null_or_overlong_details_rejected_without_stock_change(setup, reason):
    store, sku, client = setup
    body = {'sku_id': sku['id'], 'version': 0, 'delta': 2, 'reason_code': 'receipt', 'reason': reason, 'request_id': str(uuid4())}
    response = client.post('/api/v1/admin/inventory/movements', headers={'Authorization': 'Bearer reason-test-only'}, json=body)
    assert response.status_code == 422
    assert store.get()['movements'] == []
    assert store.get()['skus'][0]['on_hand'] == 0
