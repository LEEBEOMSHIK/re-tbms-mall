from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest

from app.inventory import CatalogStore, ProductCreate, ProductDelete, ProductUpdate, SkuCreate, MovementCreate
from app.main import create_app
from option_helpers import sku_body

AUTH = {'Authorization': 'Bearer delete-test-only'}
BASE = '/api/v1/admin/products/'


@pytest.fixture
def setup(monkeypatch, tmp_path):
    monkeypatch.setenv('STORE_ADMIN_TOKEN', 'delete-test-only')
    path = tmp_path / 'catalog.sqlite3'
    client = TestClient(create_app(env_file=tmp_path / 'missing', catalog_path=path))
    store = CatalogStore(path)
    row = store.create_product(ProductCreate(name='Temporary draft', category_id='tops-tee', seasons=['SP']))
    return client, store, row


def delete(client, row, body=None, headers=AUTH):
    return client.request('DELETE', BASE + row['id'], headers=headers, json=body if body is not None else {'version': row['version']})


@pytest.mark.parametrize('headers', [{}, {'Authorization': 'Bearer invalid'}])
def test_delete_auth(setup, headers):
    client, store, row = setup
    assert delete(client, row, headers=headers).status_code == 401
    assert [{k:v for k,v in p.items() if not k.startswith('publication_')} for p in store.get()['products']] == [row]


@pytest.mark.parametrize('body', [{}, {'version': -1}, {'version': True}, {'version': '0'}, {'version': 0.0}, {'version': 2147483648}, {'version': 0, 'force': True}])
def test_delete_strict_body(setup, body):
    client, store, row = setup
    assert delete(client, row, body).status_code == 422
    assert [{k:v for k,v in p.items() if not k.startswith('publication_')} for p in store.get()['products']] == [row]


def test_delete_stale_missing_success_and_counter_persistence(setup):
    client, store, row = setup
    assert delete(client, row, {'version': 1}).status_code == 409
    assert [{k:v for k,v in p.items() if not k.startswith('publication_')} for p in store.get()['products']] == [row]
    response = delete(client, row)
    assert response.status_code == 200 and response.json() == {'id': row['id'], 'deleted': True}
    assert delete(client, row).status_code == 404
    restarted = CatalogStore(store.path)
    assert restarted.get()['products'] == []
    new = restarted.create_product(ProductCreate(name='Next draft', category_id='tops-tee', seasons=['SP']))
    assert new['internal_name'] == 'TOP-TEE-SP-000002'


@pytest.mark.parametrize('with_ledger', [False, True])
def test_any_sku_blocks_delete_without_changing_ledger(setup, with_ledger):
    client, store, row = setup
    sku = store.create_sku(sku_body(store, row['id']))
    if with_ledger:
        for version, delta in [(0, 1), (1, -1)]:
            store.move(MovementCreate(sku_id=sku['id'], version=version, delta=delta, reason='Synthetic test', request_id=str(uuid4())))
    before = store.get()
    assert before['skus'][0]['on_hand'] == 0
    assert delete(client, row).status_code == 409
    assert store.get() == before


@pytest.mark.parametrize('rival', ['sku', 'update'])
def test_delete_serializes_with_sku_creation_and_update(setup, rival):
    _, store, row = setup
    gate = Barrier(2)
    def act(kind):
        connection = CatalogStore(store.path)
        gate.wait(timeout=5)
        try:
            if kind == 'delete':
                connection.delete_product(row['id'], ProductDelete(version=0))
            elif kind == 'sku':
                connection.create_sku(sku_body(connection, row['id']))
            else:
                connection.update_product(row['id'], ProductUpdate(name='Updated', category_id='tops-tee', seasons=['SP'], version=0))
            return 200
        except HTTPException as error:
            return error.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        deleted, changed = list(pool.map(act, ['delete', rival]))
    data = store.get()
    assert (deleted, changed) in [(200, 404), (409, 200)]
    if deleted == 200:
        assert data['products'] == data['skus'] == []
    elif rival == 'sku':
        assert [{k:v for k,v in p.items() if not k.startswith('publication_')} for p in data['products']] == [row] and len(data['skus']) == 1
    else:
        assert data['products'][0]['name'] == 'Updated' and data['products'][0]['version'] == 1

