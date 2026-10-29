from concurrent.futures import ThreadPoolExecutor
import json
import sqlite3
from threading import Barrier
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest

from app.inventory import CatalogStore, MovementCreate, ProductCreate, migrate_v3_to_v4
from app.main import create_app
from option_helpers import sku_body
from test_option_values import v3_db


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setenv('STORE_ADMIN_TOKEN', 'reason-test-only')
    store = CatalogStore(tmp_path / 'db')
    product = store.create_product(ProductCreate(name='Example', category_id='tops-tee', seasons=['SP']))
    sku = store.create_sku(sku_body(store, product['id']))
    client = TestClient(create_app(env_file=tmp_path / 'missing', catalog_path=store.path))
    return store, sku, client


def movement(sku_id, delta, reason_code='legacy', version=0, request_id=None):
    return MovementCreate(sku_id=sku_id, delta=delta, reason='Synthetic stock event', reason_code=reason_code, version=version, request_id=request_id or str(uuid4()))


@pytest.mark.parametrize('reason_code,delta', [('receipt', 2), ('adjust_in', 2), ('sale', -2), ('gift', -2), ('disposal', -2), ('other_out', -2), ('adjust_out', -2), ('legacy', 2), ('legacy', -2)])
def test_all_reasons_and_idempotent_replay(setup, reason_code, delta):
    store, sku, _ = setup
    store.move(movement(sku['id'], 5, 'receipt'))
    body = movement(sku['id'], delta, reason_code, version=1)
    row = store.move(body)
    assert row['reason_code'] == reason_code and row['balance_after'] == 5 + delta
    assert store.move(body) == row
    other_reason = 'adjust_in' if delta > 0 else 'other_out'
    if other_reason == reason_code:
        other_reason = 'legacy'
    with pytest.raises(HTTPException) as error:
        store.move(movement(sku['id'], delta, other_reason, version=1, request_id=body.request_id))
    assert error.value.status_code == 409
    assert len(store.get()['movements']) == 2


@pytest.mark.parametrize('code,delta', [('receipt', -1), ('adjust_in', -1), ('sale', 1), ('gift', 1), ('disposal', 1), ('other_out', 1), ('adjust_out', 1), ('sale', 0), (None, 1), ('unknown', 1), (True, 1)])
def test_reason_input_validation_and_auth(setup, code, delta):
    store, sku, client = setup
    body = {'sku_id': sku['id'], 'delta': delta, 'reason_code': code, 'reason': 'Test', 'version': 0, 'request_id': str(uuid4())}
    url = '/api/v1/admin/inventory/movements'
    assert client.post(url, json=body).status_code == 401
    assert client.post(url, headers={'Authorization': 'Bearer reason-test-only'}, json=body).status_code == 422
    assert store.get()['movements'] == []


def v4_db(path):
    v3_db(path)
    with sqlite3.connect(path) as db:
        db.row_factory = sqlite3.Row
        migrate_v3_to_v4(db)


def test_v4_preserves_original_payload_and_legacy_retry(tmp_path):
    path = tmp_path / 'db'
    v4_db(path)
    request_id = str(uuid4())
    payload = {'sku_id': 's1', 'version': 2, 'delta': 5, 'reason': 'Count', 'request_id': request_id}
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    with sqlite3.connect(path) as db:
        db.execute('UPDATE movements SET request_id=?,request_payload=?', (request_id, canonical))
        before = db.execute('SELECT * FROM movements').fetchall()
        skus = db.execute('SELECT * FROM skus').fetchall()
        products = db.execute('SELECT * FROM products').fetchall()
    store = CatalogStore(path)
    after = store.get()
    assert after['movements'][0]['reason_code'] == 'legacy'
    assert store.move(MovementCreate(**payload)) == after['movements'][0]
    assert store.move(MovementCreate(**payload, reason_code='legacy')) == after['movements'][0]
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 16
        assert [r[:-3] for r in db.execute('SELECT * FROM movements')] == before
        assert [row[:-1] for row in db.execute('SELECT * FROM skus')] == skus
        assert all(row[0] == 1 for row in db.execute('SELECT is_active FROM skus'))
        assert db.execute('SELECT * FROM products').fetchall() == products


def test_v5_migration_failure_preserves_v4(tmp_path):
    path = tmp_path / 'db'
    v4_db(path)
    with sqlite3.connect(path) as db:
        # Simulate an incompatible partial schema. Migration must not erase/reset it.
        db.execute("ALTER TABLE movements ADD COLUMN reason_code TEXT DEFAULT 'existing'")
        before = db.execute('SELECT * FROM movements').fetchall()
    with pytest.raises(HTTPException) as error:
        CatalogStore(path).get()
    assert error.value.status_code == 503
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 4
        assert db.execute('SELECT * FROM movements').fetchall() == before


def test_concurrent_sales_cannot_overdraw(setup):
    store, sku, _ = setup
    store.move(movement(sku['id'], 1, 'receipt'))
    gate = Barrier(2)
    def sell(_):
        gate.wait(timeout=5)
        try:
            CatalogStore(store.path).move(movement(sku['id'], -1, 'sale', 1))
            return 200
        except HTTPException as error:
            return error.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(sell, range(2))) == [200, 409]
    data = store.get()
    assert data['skus'][0]['on_hand'] == 0
    assert sorted(row['reason_code'] for row in data['movements']) == ['receipt', 'sale']
