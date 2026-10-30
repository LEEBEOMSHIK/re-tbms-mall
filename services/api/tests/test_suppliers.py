import sqlite3
import json
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.inventory import CatalogStore, SupplierCreate, SupplierUpdate, MovementCreate
from test_movement_reasons import setup, v4_db


def test_supplier_management_snapshot_and_replay(setup):
    store, sku, _ = setup
    supplier = store.create_supplier(SupplierCreate(name=' Factory A ', is_active=True))
    assert supplier['name'] == 'Factory A'
    with pytest.raises(HTTPException) as error:
        store.create_supplier(SupplierCreate(name='factory a', is_active=True))
    assert error.value.status_code == 409
    body = MovementCreate(sku_id=sku['id'], version=0, delta=3, reason_code='receipt', supplier_id=supplier['id'], request_id=str(uuid4()))
    event = store.move(body)
    assert event['supplier_name'] == 'Factory A' and event['supplier_id'] == supplier['id']
    changed = store.update_supplier(supplier['id'], SupplierUpdate(name='Factory renamed', is_active=False, version=0))
    assert changed['version'] == 1
    assert store.move(body) == event
    assert store.get()['movements'][0]['supplier_name'] == 'Factory A'
    with pytest.raises(HTTPException) as error:
        store.move(MovementCreate(**{**body.model_dump(), 'request_id': str(uuid4()), 'version': 1}))
    assert error.value.status_code == 422
    another = store.create_supplier(SupplierCreate(name='Factory B', is_active=True))
    with pytest.raises(HTTPException) as error:
        store.move(MovementCreate(**{**body.model_dump(), 'supplier_id': another['id']}))
    assert error.value.status_code == 409
    with pytest.raises(HTTPException) as error:
        store.update_supplier(supplier['id'], SupplierUpdate(name='New', is_active=True, version=0))
    assert error.value.status_code == 409
    with pytest.raises(HTTPException) as error:
        store.update_supplier(supplier['id'], SupplierUpdate(name='Factory B', is_active=True, version=1))
    assert error.value.status_code == 409


def test_supplier_http_auth_input_and_movement_validation(setup):
    store, sku, client = setup
    url = '/api/v1/admin/suppliers'
    auth = {'Authorization': 'Bearer reason-test-only'}
    body = {'name': 'Factory', 'is_active': True}
    assert client.post(url, json=body).status_code == 401
    assert client.put(url + '/missing', json={**body, 'version': 0}).status_code == 401
    for extra in [{'name': ''}, {'name': ' '}, {'name': 'x' * 121}, {'is_active': 1}]:
        assert client.post(url, headers=auth, json={**body, **extra}).status_code == 422
    response = client.post(url, headers=auth, json=body)
    assert response.status_code == 201
    row = response.json()
    assert client.put(url + '/missing', headers=auth, json={**body, 'version': 0}).status_code == 404
    assert client.put(url + '/' + row['id'], headers=auth, json={**body, 'version': True}).status_code == 422
    movement = {'sku_id': sku['id'], 'version': 0, 'delta': 1, 'reason_code': 'receipt', 'request_id': str(uuid4())}
    movement_url = '/api/v1/admin/inventory/movements'
    assert client.post(movement_url, headers=auth, json={**movement, 'supplier_id': 'missing'}).status_code == 404
    for reason_code, delta in [('sale', -1), ('gift', -1), ('adjust_in', 1), ('legacy', 1)]:
        assert client.post(movement_url, headers=auth, json={**movement, 'supplier_id': row['id'], 'reason_code': reason_code, 'delta': delta}).status_code == 422
    assert store.get()['movements'] == []
    response = client.post(movement_url, headers=auth, json=movement)
    assert response.status_code == 200 and response.json()['supplier_id'] is None and response.json()['supplier_name'] is None
    assert client.post(movement_url, headers=auth, json={**movement, 'supplier_id': None}).json() == response.json()


def v5_db(path):
    v4_db(path)
    with sqlite3.connect(path) as db:
        db.execute("ALTER TABLE movements ADD COLUMN reason_code TEXT NOT NULL DEFAULT 'legacy'")
        db.execute('PRAGMA user_version=5')


@pytest.mark.parametrize('reason_code', ['legacy', 'receipt'])
def test_v5_existing_payload_retry_with_null_supplier(tmp_path, reason_code):
    path = tmp_path / 'db'
    v5_db(path)
    payload = {'sku_id': 's1', 'version': 2, 'delta': 5, 'reason': 'Count', 'request_id': str(uuid4())}
    if reason_code != 'legacy':
        payload['reason_code'] = reason_code
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    with sqlite3.connect(path) as db:
        db.execute('UPDATE movements SET reason_code=?,request_id=?,request_payload=?', (reason_code, payload['request_id'], canonical))
    store = CatalogStore(path)
    before = store.get()
    assert store.move(MovementCreate(**payload, supplier_id=None)) == before['movements'][0]
    assert store.get() == before
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT request_payload FROM movements').fetchone()[0] == canonical


def test_v6_preserves_all_old_fields_and_failure_rollback(tmp_path):
    path = tmp_path / 'db'
    v5_db(path)
    with sqlite3.connect(path) as db:
        before = db.execute('SELECT * FROM movements').fetchall()
        skus = db.execute('SELECT * FROM skus').fetchall()
        products = db.execute('SELECT * FROM products').fetchall()
    data = CatalogStore(path).get()
    assert data['suppliers'] == []
    assert all(event['supplier_id'] is None and event['supplier_name'] is None for event in data['movements'])
    with sqlite3.connect(path) as db:
        assert [row[:-2] for row in db.execute('SELECT * FROM movements')] == before
        assert [row[:-1] for row in db.execute('SELECT * FROM products')] == products
        assert [row[:-1] for row in db.execute('SELECT * FROM skus')] == skus
        assert all(row[0] == 1 for row in db.execute('SELECT is_active FROM skus'))
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []
        assert db.execute('PRAGMA user_version').fetchone()[0] == 17
    broken = tmp_path / 'broken'
    v5_db(broken)
    with sqlite3.connect(broken) as db:
        db.execute('ALTER TABLE movements ADD COLUMN supplier_name TEXT')
    with pytest.raises(HTTPException) as error:
        CatalogStore(broken).get()
    assert error.value.status_code == 503
    with sqlite3.connect(broken) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 5
        assert not db.execute("SELECT name FROM sqlite_master WHERE name='suppliers'").fetchall()
        assert 'supplier_id' not in [row[1] for row in db.execute('PRAGMA table_info(movements)')]
