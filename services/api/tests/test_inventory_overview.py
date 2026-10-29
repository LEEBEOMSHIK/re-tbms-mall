"""Dashboard totals always follow the same physical stock as inventory lists."""
import sqlite3
from uuid import uuid4

from test_inventory import setup, sku, snapshot, AUTH, BASE


def overview(client):
    response = client.get(BASE + '/inventory/overview', headers=AUTH)
    assert response.status_code == 200
    return response.json()


def test_overview_auth_empty_and_read_only(setup):
    client, path, _ = setup
    for headers in [{}, {'Authorization': 'Bearer wrong'}, {'Authorization': 'Bearer factory-session'}]:
        assert client.get(BASE + '/inventory/overview', headers=headers).status_code == 401
    assert not path.exists()
    result = overview(client)
    assert result['mode'] == 'local'
    assert (result['total_on_hand'], result['option_count'], result['low_stock_count'], result['low_stock_preview']) == (0, 0, 0, [])
    assert client.post(BASE + '/inventory/overview', headers=AUTH, json={}).status_code == 405


def test_overview_tracks_receipt_outbound_adjustment_and_threshold_boundary(setup):
    client, _, _ = setup
    item = sku(client)
    supplier = client.post(BASE + '/suppliers', headers=AUTH, json={'name': 'Overview Test', 'is_active': True}).json()
    assert overview(client)['low_stock_count'] == 1
    for version, delta, reason, expected in [(0, 8, 'receipt', 8), (1, -6, 'sale', 2), (2, -1, 'gift', 1), (3, 4, 'adjust_in', 5)]:
        body = {'sku_id': item['id'], 'version': version, 'delta': delta, 'reason_code': reason, 'reason': '', 'request_id': str(uuid4())}
        if reason == 'receipt':
            body['supplier_id'] = supplier['id']
        response = client.post(BASE + '/inventory/movements', headers=AUTH, json=body)
        assert response.status_code == 200, response.text
        result = overview(client)
        assert result['total_on_hand'] == expected == snapshot(client)['skus'][0]['on_hand']
        assert result['low_stock_count'] == int(expected <= 2)
        assert len(result['low_stock_preview']) == int(expected <= 2)
    before = snapshot(client)
    invalid = client.post(BASE + '/inventory/movements', headers=AUTH, json={'sku_id': item['id'], 'version': 4, 'delta': -6, 'reason_code': 'sale', 'request_id': str(uuid4())})
    assert invalid.status_code == 409
    assert overview(client)['total_on_hand'] == 5
    assert snapshot(client) == before


def test_inactive_stock_and_threshold_updates_remain_visible(setup):
    client, _, _ = setup
    item = sku(client)
    changed = client.put(BASE + '/skus/' + item['id'] + '/settings', headers=AUTH, json={'version': 0, 'is_active': False, 'reorder_point': 0})
    assert changed.status_code == 200, changed.text
    result = overview(client)
    assert result['option_count'] == result['low_stock_count'] == 1
    assert result['low_stock_preview'][0]['is_active'] is False
    assert result['low_stock_preview'][0]['reorder_point'] == 0


def test_preview_is_bounded_deterministic_and_totals_not_preview_totals(setup):
    client, path, _ = setup
    item = sku(client)
    # Isolated fixture only: distinct domain values keep the actual production constraints intact.
    for i in range(7):
        color = client.post(BASE + '/option-values', headers=AUTH, json={'kind': 'color', 'name': f'Color {i}', 'code': f'C{i}', 'is_active': True, 'sort_order': i}).json()
        row = client.post(BASE + '/skus', headers=AUTH, json={'product_id': item['product_id'], 'color_id': color['id'], 'size_id': item['size_id'], 'reorder_point': 2})
        assert row.status_code == 201
    first = overview(client)
    assert first['option_count'] == first['low_stock_count'] == 8
    assert len(first['low_stock_preview']) == 5
    assert overview(client)['low_stock_preview'] == first['low_stock_preview']


def test_storage_failure_is_not_zero_or_sample(setup):
    client, path, _ = setup
    overview(client)
    with sqlite3.connect(path) as db:
        db.execute('PRAGMA user_version=999')
    assert client.get(BASE + '/inventory/overview', headers=AUTH).status_code == 503
