from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import sqlite3
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.inventory import CatalogStore, MovementCreate
from app.main import create_app

BASE = '/api/v1/admin'
AUTH = {'Authorization': 'Bearer inventory-test-only'}


@pytest.fixture
def setup(monkeypatch, tmp_path):
    monkeypatch.delenv('STORE_ADMIN_TOKEN', raising=False)
    env = tmp_path / '.env'
    env.write_text('STORE_ADMIN_TOKEN=inventory-test-only\n', encoding='utf-8')
    path = tmp_path / 'catalog.sqlite3'
    def make_client():
        return TestClient(create_app(env_file=env, catalog_path=path, storefront_path=tmp_path / 'storefront.json'))
    return make_client(), path, make_client


def product(client):
    response = client.post(BASE + '/products', headers=AUTH, json={'name': ' Shirt ', 'category_id': ' tops-tee ', 'seasons': ['SP']})
    assert response.status_code == 201
    return response.json()


def sku(client):
    ids = {}
    for kind, name, code in [('color', 'Black', 'BLK'), ('size', 'M', 'M')]:
        response = client.post(BASE + '/option-values', headers=AUTH, json={'kind': kind, 'name': name, 'code': code, 'is_active': True, 'sort_order': 0})
        assert response.status_code == 201
        ids[kind + '_id'] = response.json()['id']
    body = {'product_id': product(client)['id'], **ids, 'reorder_point': 2}
    response = client.post(BASE + '/skus', headers=AUTH, json=body)
    assert response.status_code == 201
    return response.json()


def movement(sku_id, delta=1, version=0):
    return {'sku_id': sku_id, 'version': version, 'delta': delta, 'reason': 'Stock count', 'request_id': str(uuid4())}


def post_move(client, body):
    return client.post(BASE + '/inventory/movements', headers=AUTH, json=body)


def snapshot(client):
    response = client.get(BASE + '/catalog', headers=AUTH)
    assert response.status_code == 200
    return response.json()


@pytest.mark.parametrize('method,path,body', [
    ('GET', '/catalog', None), ('POST', '/products', {'name': 'N', 'category_id': 'tops-tee', 'seasons': ['SP']}),
    ('PUT', '/products/missing', {'name': 'N', 'category_id': 'tops-tee', 'seasons': ['SP'], 'version': 0}),
    ('POST', '/skus', {'product_id': 'missing', 'color_id': 'C', 'size_id': 'M', 'reorder_point': 0}),
    ('POST', '/inventory/movements', movement('missing')),
])
@pytest.mark.parametrize('headers', [{}, {'Authorization': 'Bearer incorrect'}])
def test_all_catalog_routes_require_admin(setup, method, path, body, headers):
    client, db, _ = setup
    assert client.request(method, BASE + path, headers=headers, json=body).status_code == 401
    assert not db.exists()


def test_empty_catalog_product_update_and_no_publish(setup):
    client, _, _ = setup
    public_before = client.get('/api/v1/storefront').json()
    assert snapshot(client) == {'mode': 'local', 'categories': snapshot(client)['categories'], 'season_options': snapshot(client)['season_options'], 'products': [], 'skus': [], 'movements': [], 'product_readiness': [], 'option_values': [], 'suppliers': [], 'country_codes': snapshot(client)['country_codes']}
    row = product(client)
    assert str(UUID(row['id'])) == row['id']
    assert row['name'] == 'Shirt' and row['category'] == '티셔츠' and row['version'] == 0
    body = {'name': 'Edited', 'category_id': 'tops-tee', 'seasons': ['SP'], 'description': 'Draft', 'version': 0}
    assert client.put(BASE + '/products/' + row['id'], headers=AUTH, json=body).json()['version'] == 1
    assert client.put(BASE + '/products/' + row['id'], headers=AUTH, json=body).status_code == 409
    assert client.put(BASE + '/products/missing', headers=AUTH, json=body).status_code == 404
    assert client.get('/api/v1/storefront').json() == public_before


def test_sku_uniqueness_and_unknown_product(setup):
    client, _, _ = setup
    row = sku(client)
    assert row['on_hand'] == row['version'] == 0
    body = {key: row[key] for key in ['product_id', 'color_id', 'size_id', 'reorder_point']}
    assert client.post(BASE + '/skus', headers=AUTH, json=body).status_code == 409
    assert client.post(BASE + '/skus', headers=AUTH, json={**body, 'code': 'FORGED'}).status_code == 422
    assert client.post(BASE + '/skus', headers=AUTH, json={**body, 'product_id': 'missing'}).status_code == 404
    assert len(snapshot(client)['skus']) == 1


@pytest.mark.parametrize('field,value', [('delta', 0), ('delta', True), ('delta', 1.5), ('delta', '1'), ('delta', 1000001), ('version', -1), ('version', False), ('reason', None), ('reason', 'x' * 301), ('request_id', 'bad'), ('actor', 'forged')])
def test_invalid_movements(setup, field, value):
    client, _, _ = setup
    row = sku(client)
    assert post_move(client, {**movement(row['id']), field: value}).status_code == 422
    assert snapshot(client)['movements'] == []


@pytest.mark.parametrize('body', [{'name': ' ', 'category_id': 'tops-tee', 'seasons': ['SP']}, {'name': 'x' * 121, 'category_id': 'tops-tee', 'seasons': ['SP']}, {'name': 'Shirt', 'category_id': 'tops-tee', 'seasons': ['SP'], 'on_hand': 10}])
def test_invalid_product(setup, body):
    assert setup[0].post(BASE + '/products', headers=AUTH, json=body).status_code == 422


@pytest.mark.parametrize('extra', [{'category_id': 'missing'}, {'category': 'Free text'}, {'internal_name': 'FORGED'}])
def test_product_naming_contract_enforced_on_create_and_update(setup, extra):
    client, _, _ = setup
    row = product(client)
    body = {'name': 'Customer name', 'category_id': 'tops-tee', 'seasons': ['SP'], **extra}
    assert client.post(BASE + '/products', headers=AUTH, json=body).status_code == 422
    assert client.put(BASE + '/products/' + row['id'], headers=AUTH, json={**body, 'version': 0}).status_code == 422
    assert [{k:v for k,v in p.items() if not k.startswith('publication_')} for p in snapshot(client)['products']] == [row]


def test_stock_bounds_replay_conflicts_and_persistence(setup):
    client, _, make_client = setup
    row = sku(client)
    assert post_move(client, movement('missing')).status_code == 404
    assert post_move(client, movement(row['id'], -1)).status_code == 409
    body = movement(row['id'], 1000000)
    first = post_move(client, body)
    assert first.status_code == 200
    receipt = first.json()
    assert receipt['balance_after'] == 1000000 and receipt['actor'] == 'local-admin'
    assert datetime.fromisoformat(receipt['created_at']).utcoffset().total_seconds() == 0
    assert post_move(client, body).json() == receipt
    assert post_move(client, {**body, 'reason': 'different'}).status_code == 409
    assert post_move(client, movement(row['id'], 1, 1)).status_code == 409
    assert post_move(client, movement(row['id'], -1, 0)).status_code == 409
    assert post_move(client, movement(row['id'], -1000000, 1)).status_code == 200
    data = snapshot(make_client())
    assert data['skus'][0]['on_hand'] == 0 and data['skus'][0]['version'] == 2
    assert len(data['movements']) == 2
    assert sum(item['delta'] for item in data['movements']) == 0


def test_ledger_failure_rolls_back_balance(setup):
    client, path, _ = setup
    row = sku(client)
    with sqlite3.connect(path) as db:
        db.execute("CREATE TRIGGER fail_ledger BEFORE INSERT ON movements BEGIN SELECT RAISE(ABORT, 'test'); END")
    assert post_move(client, movement(row['id'])).status_code == 503
    data = snapshot(client)
    assert data['skus'][0]['on_hand'] == data['skus'][0]['version'] == 0
    assert data['movements'] == []


def test_concurrent_decrement_cannot_oversell(setup):
    client, path, _ = setup
    row = sku(client)
    assert post_move(client, movement(row['id'])).status_code == 200
    gate = Barrier(2)
    def decrement(_):
        gate.wait(timeout=5)
        try:
            CatalogStore(path).move(MovementCreate(**movement(row['id'], -1, 1)))
            return 200
        except HTTPException as exc:
            return exc.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(decrement, range(2))) == [200, 409]
    data = snapshot(client)
    assert data['skus'][0]['on_hand'] == 0
    assert len(data['movements']) == 2
    assert sum(item['delta'] for item in data['movements']) == 0


@pytest.mark.parametrize('version', [0, 9])
def test_unknown_schema_not_reset(setup, version):
    client, path, _ = setup
    with sqlite3.connect(path) as db:
        db.execute('CREATE TABLE preserve_me(value TEXT)')
        db.execute("INSERT INTO preserve_me VALUES('keep')")
        db.execute(f'PRAGMA user_version={version}')
    assert client.get(BASE + '/catalog', headers=AUTH).status_code == 503
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT value FROM preserve_me').fetchone()[0] == 'keep'


def test_corrupt_storage_returns_bounded_error(setup):
    client, path, _ = setup
    path.write_bytes(b'not a database')
    response = client.get(BASE + '/catalog', headers=AUTH)
    assert response.status_code == 503
    assert response.json() == {'detail': 'Local catalogue storage is unavailable.'}
    assert path.read_bytes() == b'not a database'


