import pytest
from fastapi.testclient import TestClient

from app.main import create_app

URL = '/api/v1/admin/dashboard'
AUTH = {'Authorization': 'Bearer dashboard-test-only'}


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.delenv('STORE_ADMIN_TOKEN', raising=False)
    env = tmp_path / '.env'
    env.write_text('STORE_ADMIN_TOKEN=dashboard-test-only\n', encoding='utf-8')
    return TestClient(create_app(env_file=env, storefront_path=tmp_path / 'storefront.json', catalog_path=tmp_path / 'catalog.sqlite3'))


@pytest.mark.parametrize('headers', [{}, {'Authorization': 'Bearer wrong'}])
def test_dashboard_requires_admin(client, headers):
    assert client.get(URL, headers=headers).status_code == 401


def test_dashboard_sample_contract_and_derived_totals(client):
    response = client.get(URL, headers=AUTH)
    assert response.status_code == 200
    data = response.json()
    assert data['mode'] == 'sample'
    assert data['as_of'] == '2026-10-26T09:00:00+09:00'
    assert data['summary'] == {
        'open_tasks': len(data['tasks']),
        'unanswered_qna': sum(row['status'] == 'unanswered' for row in data['qna']),
        'inbound_pending': sum(row['status'] != 'received' for row in data['inbound']),
        'shipping_delayed': sum(row['status'] == 'delayed' for row in data['shipments']),
        'low_stock_skus': sum(row['available'] <= row['reorder_point'] for row in data['inventory']),
    }
    for area in ['tasks', 'qna', 'inbound', 'shipments', 'inventory']:
        assert 4 <= len(data[area]) <= 6
        assert len({row['id'] for row in data[area]}) == len(data[area])
    for row in data['inventory']:
        assert row['on_hand'] >= row['reserved'] >= 0
        assert row['available'] == row['on_hand'] - row['reserved']
    assert any(row['available'] == 0 for row in data['inventory'])
    assert any(row['available'] == row['reorder_point'] for row in data['inventory'])
    assert {row['area'] for row in data['tasks']} == {'qna', 'inbound', 'shipping', 'inventory'}


def test_dashboard_is_read_only_and_stable(client):
    first = client.get(URL, headers=AUTH).json()
    assert client.post(URL, headers=AUTH, json={}).status_code == 405
    assert client.put(URL, headers=AUTH, json={}).status_code == 405
    assert client.get(URL, headers=AUTH).json() == first
