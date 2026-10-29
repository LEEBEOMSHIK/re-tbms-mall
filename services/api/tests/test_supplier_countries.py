import sqlite3
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.countries import COUNTRY_CODES
from app.inventory import CatalogStore, SupplierCreate, SupplierUpdate, MovementCreate, SUPPLIER_DETAILS
from test_movement_reasons import setup
from test_supplier_details import v6_db


def test_country_list_and_address_changes_preserve_existing(setup):
    store, sku, client = setup
    assert len(COUNTRY_CODES) == len(set(COUNTRY_CODES)) == 249
    assert list(COUNTRY_CODES) == sorted(COUNTRY_CODES)
    assert {'KR', 'US', 'GB', 'JP', 'AX', 'BQ', 'SS'} <= set(COUNTRY_CODES)
    row = store.create_supplier(SupplierCreate(name='Example', is_active=True, country_code=' KR ', region=' 서울 ', city='성동구', postal_code='LEGACY POST', address='기존 주소', address_detail='101호'))
    assert row['country_code'] == 'KR' and row['region'] == '서울'
    event = store.move(MovementCreate(sku_id=sku['id'], version=0, delta=1, reason_code='receipt', supplier_id=row['id'], request_id=str(uuid4())))
    changed = store.update_supplier(row['id'], SupplierUpdate(name='Example', is_active=True, version=0, country_code='US'))
    for key in ['postal_code', 'address', 'address_detail', 'region', 'city']:
        assert changed[key] == row[key]
    omitted = store.update_supplier(row['id'], SupplierUpdate(name='Example', is_active=True, version=1))
    assert omitted['country_code'] == 'US'
    cleared = store.update_supplier(row['id'], SupplierUpdate(name='Example', is_active=True, version=2, country_code='', region='', city=''))
    assert cleared['country_code'] == cleared['region'] == cleared['city'] == ''
    assert cleared['address'] == row['address']
    assert store.get()['movements'] == [event]
    with pytest.raises(HTTPException) as error:
        store.update_supplier(row['id'], SupplierUpdate(name='Example', is_active=True, version=2, country_code='JP'))
    assert error.value.status_code == 409
    response = client.get('/api/v1/admin/catalog', headers={'Authorization': 'Bearer reason-test-only'})
    assert response.json()['country_codes'] == list(COUNTRY_CODES)


@pytest.mark.parametrize('fields', [{'country_code': 'ZZ'}, {'country_code': 'UK'}, {'country_code': 'kr'}, {'country_code': 'KOR'}, {'country_code': None}, {'region': None}, {'city': None}, {'region': '가' * 121}, {'city': '界' * 121}])
def test_country_fields_strict_validation_and_auth(setup, fields):
    store, _, client = setup
    body = {'name': 'Example', 'is_active': True, **fields}
    assert client.post('/api/v1/admin/suppliers', json=body).status_code == 401
    assert client.post('/api/v1/admin/suppliers', headers={'Authorization': 'Bearer reason-test-only'}, json=body).status_code == 422
    assert store.get()['suppliers'] == []


def test_unicode_bounds_and_unset_legacy_default(setup):
    store, _, _ = setup
    row = store.create_supplier(SupplierCreate(name='Example', is_active=True, region='가' * 120, city='界' * 120))
    assert row['country_code'] == '' and len(row['region']) == len(row['city']) == 120


def v7_db(path):
    v6_db(path)
    with sqlite3.connect(path) as db:
        for field in SUPPLIER_DETAILS:
            db.execute(f"ALTER TABLE suppliers ADD COLUMN {field} TEXT NOT NULL DEFAULT ''")
        db.execute("UPDATE suppliers SET address='기존 주소',postal_code='KEEP POST',memo='Preserve'")
        db.execute('PRAGMA user_version=7')


def test_v8_migration_exact_preservation_and_rollback(tmp_path):
    path = tmp_path / 'db'
    v7_db(path)
    with sqlite3.connect(path) as db:
        suppliers = db.execute('SELECT * FROM suppliers').fetchall()
        ledger = db.execute('SELECT * FROM movements').fetchall()
    data = CatalogStore(path).get()
    assert data['suppliers'][0]['country_code'] == data['suppliers'][0]['region'] == data['suppliers'][0]['city'] == ''
    with sqlite3.connect(path) as db:
        assert [row[:-3] for row in db.execute('SELECT * FROM suppliers')] == suppliers
        assert db.execute('SELECT * FROM movements').fetchall() == ledger
        assert db.execute('PRAGMA user_version').fetchone()[0] == 16
    broken = tmp_path / 'broken'
    v7_db(broken)
    with sqlite3.connect(broken) as db:
        db.execute("ALTER TABLE suppliers ADD COLUMN city TEXT NOT NULL DEFAULT ''")
    with pytest.raises(HTTPException):
        CatalogStore(broken).get()
    with sqlite3.connect(broken) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 7
        assert 'country_code' not in [row[1] for row in db.execute('PRAGMA table_info(suppliers)')]
