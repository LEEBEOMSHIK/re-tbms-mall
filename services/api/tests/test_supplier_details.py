import sqlite3
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.inventory import CatalogStore, SupplierCreate, SupplierUpdate, MovementCreate, SUPPLIER_DETAILS
from test_movement_reasons import setup
from test_suppliers import v5_db


DETAILS = {'english_name': 'Factory English', 'representative_name': 'Example Representative',
    'phone': '+44 (20) 1234-5678', 'business_number': 'EXAMPLE-REG-1', 'contact_name': 'Example Contact',
    'contact_phone': '+82 (0)10.1234.5678', 'email': 'contact@example.test', 'postal_code': 'AB12 3CD',
    'address': 'Example road', 'address_detail': 'Example unit', 'memo': 'Synthetic test data'}
LIMITS = dict(zip(SUPPLIER_DETAILS, [120, 80, 40, 40, 80, 40, 254, 20, 240, 240, 1000]))


def test_optional_details_trim_omit_preserve_clear_and_snapshot(setup):
    store, sku, _ = setup
    row = store.create_supplier(SupplierCreate(name='Example', is_active=True, **{k: ' ' + v + ' ' for k, v in DETAILS.items()}))
    assert {key: row[key] for key in DETAILS} == DETAILS
    event = store.move(MovementCreate(sku_id=sku['id'], delta=1, version=0, reason_code='receipt', supplier_id=row['id'], request_id=str(uuid4())))
    changed = store.update_supplier(row['id'], SupplierUpdate(name='Renamed', is_active=True, version=0))
    assert {key: changed[key] for key in DETAILS} == DETAILS
    cleared = store.update_supplier(row['id'], SupplierUpdate(name='Renamed', is_active=True, version=1, **{key: '' for key in DETAILS}))
    assert all(cleared[key] == '' for key in DETAILS)
    assert store.get()['movements'] == [event] and event['supplier_name'] == 'Example'
    with pytest.raises(HTTPException) as error:
        store.update_supplier(row['id'], SupplierUpdate(name='Stale', is_active=True, version=1, email='new@example.test'))
    assert error.value.status_code == 409
    assert store.get()['suppliers'] == [cleared]


@pytest.mark.parametrize('field', list(SUPPLIER_DETAILS))
def test_optional_field_null_and_overlong_rejected(setup, field):
    store, _, client = setup
    url = '/api/v1/admin/suppliers'
    auth = {'Authorization': 'Bearer reason-test-only'}
    for value in [None, 'x' * (LIMITS[field] + 1)]:
        assert client.post(url, headers=auth, json={'name': 'Example', 'is_active': True, field: value}).status_code == 422
    assert store.get()['suppliers'] == []


@pytest.mark.parametrize('field,value', [('email', 'not-an-email'), ('email', 'a@domain'), ('email', 'a b@example.test'), ('phone', '010abc'), ('contact_phone', '123/456')])
def test_detail_format_validation(setup, field, value):
    _, _, client = setup
    assert client.post('/api/v1/admin/suppliers', headers={'Authorization': 'Bearer reason-test-only'}, json={'name': 'Example', 'is_active': True, field: value}).status_code == 422


def test_details_auth_defaults_and_max_lengths(setup):
    store, _, client = setup
    url = '/api/v1/admin/suppliers'
    body = {'name': 'Example', 'is_active': True, **DETAILS}
    assert client.post(url, json=body).status_code == 401
    defaults = store.create_supplier(SupplierCreate(name='Defaults', is_active=True))
    assert all(defaults[field] == '' for field in SUPPLIER_DETAILS)
    max_values = {field: 'x' * limit for field, limit in LIMITS.items()}
    max_values.update(phone='1' * 11, contact_phone='+' + '1' * 15, email='a' * 240 + '@example.test')
    row = store.create_supplier(SupplierCreate(name='Max', is_active=True, **max_values))
    assert all(row[field] == value for field, value in max_values.items())


def v6_db(path):
    v5_db(path)
    with sqlite3.connect(path) as db:
        db.execute('CREATE TABLE suppliers(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,is_active INTEGER NOT NULL,version INTEGER NOT NULL)')
        db.execute("INSERT INTO suppliers VALUES('old','Old supplier','old supplier',1,4)")
        db.execute('ALTER TABLE movements ADD COLUMN supplier_id TEXT REFERENCES suppliers(id)')
        db.execute('ALTER TABLE movements ADD COLUMN supplier_name TEXT')
        db.execute("UPDATE movements SET supplier_id='old',supplier_name='Past name'")
        db.execute('PRAGMA user_version=6')


def test_v7_migration_preserves_and_failure_rolls_back(tmp_path):
    path = tmp_path / 'db'
    v6_db(path)
    with sqlite3.connect(path) as db:
        old = db.execute('SELECT * FROM suppliers').fetchall()
        ledger = db.execute('SELECT * FROM movements').fetchall()
    rows = CatalogStore(path).get()['suppliers']
    assert rows[0]['version'] == 4 and all(rows[0][field] == '' for field in SUPPLIER_DETAILS)
    with sqlite3.connect(path) as db:
        assert [row[:5] for row in db.execute('SELECT * FROM suppliers')] == old
        assert db.execute('SELECT * FROM movements').fetchall() == ledger
        assert db.execute('PRAGMA user_version').fetchone()[0] == 17
    broken = tmp_path / 'broken'
    v6_db(broken)
    with sqlite3.connect(broken) as db:
        db.execute("ALTER TABLE suppliers ADD COLUMN memo TEXT NOT NULL DEFAULT ''")
    with pytest.raises(HTTPException) as error:
        CatalogStore(broken).get()
    assert error.value.status_code == 503
    with sqlite3.connect(broken) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 6
        assert 'english_name' not in [row[1] for row in db.execute('PRAGMA table_info(suppliers)')]
