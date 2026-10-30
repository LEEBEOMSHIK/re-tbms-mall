import sqlite3

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.inventory import CatalogStore, CategoryCreate, CategoryUpdate, ProductCreate, ProductUpdate, migrate_v1_to_v2
from app.main import create_app
from test_product_naming import legacy_db


def draft(seasons=None, category='tops-tee'):
    return ProductCreate(name='Customer name', category_id=category, seasons=seasons if seasons is not None else ['SP'])


def change(store, category_id, **changes):
    row = next(c for c in store.get()['categories'] if c['id'] == category_id)
    return store.update_category(category_id, CategoryUpdate(**{key: changes.get(key, row[key]) for key in ['name', 'sort_order', 'is_active', 'version']}))


def test_season_canonical_sequence_and_restart(tmp_path):
    path = tmp_path / 'db'
    store = CatalogStore(path)
    one = store.create_product(draft(['FA', 'SP']))
    assert one['seasons'] == ['SP', 'FA'] and one['internal_name'] == 'TOP-TEE-SPFA-000001'
    assert CatalogStore(path).create_product(draft(['SP', 'FA']))['internal_name'] == 'TOP-TEE-SPFA-000002'
    assert store.create_product(draft(['SU']))['internal_name'] == 'TOP-TEE-SU-000001'
    assert store.create_product(draft(['WI', 'FA', 'SU', 'SP']))['internal_name'] == 'TOP-TEE-ALL-000001'
    assert store.create_product(draft(['ALL']))['internal_name'] == 'TOP-TEE-ALL-000002'


@pytest.mark.parametrize('seasons', [['SP', 'SP'], ['ALL', 'SP'], ['XX'], ['sp'], [True]])
def test_invalid_seasons(seasons):
    with pytest.raises(ValueError):
        draft(seasons)


def test_active_leaf_validation_and_unchanged_edit(tmp_path):
    store = CatalogStore(tmp_path / 'db')
    for body in [draft([]), draft(category='tops')]:
        with pytest.raises(HTTPException) as error:
            store.create_product(body)
        assert error.value.status_code == 422
    row = store.create_product(draft())
    change(store, 'tops', is_active=False)
    with pytest.raises(HTTPException):
        store.create_product(draft())
    updated = store.update_product(row['id'], ProductUpdate(name='Edited', category_id='tops-tee', seasons=['SP'], version=0))
    assert updated['internal_name'] == row['internal_name']
    with pytest.raises(HTTPException):
        store.update_product(row['id'], ProductUpdate(name='Edited', category_id='tops-tee', seasons=['SU'], version=1))
    change(store, 'tops', is_active=True)
    change(store, 'tops-tee', is_active=False)
    with pytest.raises(HTTPException):
        store.create_product(draft())


def test_category_management_and_rename_sync(tmp_path):
    store = CatalogStore(tmp_path / 'db')
    row = store.create_product(draft())
    renamed = change(store, 'tops-tee', name='반팔', sort_order=99)
    assert renamed['version'] == 1 and renamed['is_active'] is True
    product = store.get()['products'][0]
    assert {k:v for k,v in product.items() if not k.startswith('publication_')} == {**row, 'category': '반팔'}
    with pytest.raises(HTTPException) as error:
        store.update_category('tops-tee', CategoryUpdate(name='Name', sort_order=0, is_active=True, version=0))
    assert error.value.status_code == 409
    root = store.create_category(CategoryCreate(name='신규', code='NEW', parent_id=None, sort_order=5, is_active=True))
    leaf = store.create_category(CategoryCreate(name='하위', code='SUB', parent_id=root['id'], sort_order=0, is_active=True))
    with pytest.raises(HTTPException) as error:
        store.create_category(CategoryCreate(name='삼단계', code='THIRD', parent_id=leaf['id'], sort_order=0, is_active=True))
    assert error.value.status_code == 422
    for name, code in [('신규', 'DIFF'), ('다른', 'NEW')]:
        with pytest.raises(HTTPException) as error:
            store.create_category(CategoryCreate(name=name, code=code, parent_id=None, sort_order=0, is_active=True))
        assert error.value.status_code == 409


def v2_db(path):
    legacy_db(path)
    with sqlite3.connect(path) as db:
        db.row_factory = sqlite3.Row
        migrate_v1_to_v2(db)


def test_v2_migration_preserves_legacy_and_collision(tmp_path):
    path = tmp_path / 'db'
    v2_db(path)
    with sqlite3.connect(path) as db:
        before = db.execute('SELECT * FROM products ORDER BY rowid').fetchall()
        db.execute("INSERT INTO categories VALUES('existing','기존','TEE')")
    store = CatalogStore(path)
    data = store.get()
    assert next(c for c in data['categories'] if c['id'] == 'tops-tee')['code'] == 'TEE1'
    assert all(p['seasons'] == [] for p in data['products'])
    with sqlite3.connect(path) as db:
        assert [r[:-2] for r in db.execute('SELECT * FROM products ORDER BY rowid')] == before
    old = data['products'][0]
    updated = store.update_product(old['id'], ProductUpdate(name='Renamed', category_id=old['category_id'], seasons=[], version=old['version']))
    assert updated['internal_name'] == old['internal_name']
    with pytest.raises(HTTPException):
        store.update_product(old['id'], ProductUpdate(name='Renamed', category_id=old['category_id'], seasons=['SP'], version=updated['version']))


def test_v3_failure_rolls_back_schema_and_products(tmp_path):
    path = tmp_path / 'db'
    v2_db(path)
    with sqlite3.connect(path) as db:
        before = db.execute('SELECT * FROM products').fetchall()
        db.execute("CREATE TRIGGER fail_category BEFORE INSERT ON categories BEGIN SELECT RAISE(ABORT, 'test'); END")
    with pytest.raises(HTTPException) as error:
        CatalogStore(path).get()
    assert error.value.status_code == 503
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 2
        assert db.execute('SELECT * FROM products').fetchall() == before
        assert [r[1] for r in db.execute('PRAGMA table_info(categories)')] == ['id', 'name', 'code']
        db.execute('DROP TRIGGER fail_category')
    assert len(CatalogStore(path).get()['categories']) > 5


def test_category_http_auth_validation_and_immutable_fields(monkeypatch, tmp_path):
    monkeypatch.setenv('STORE_ADMIN_TOKEN', 'synthetic-token')
    client = TestClient(create_app(env_file=tmp_path / 'none', catalog_path=tmp_path / 'db'))
    auth = {'Authorization': 'Bearer synthetic-token'}
    body = {'name': 'New', 'code': 'NEW', 'parent_id': None, 'sort_order': 0, 'is_active': True}
    assert client.post('/api/v1/admin/categories', json=body).status_code == 401
    assert client.put('/api/v1/admin/categories/tops', json={'name': 'N', 'sort_order': 0, 'is_active': True, 'version': 0}).status_code == 401
    for extra in [{'code': 'low'}, {'code': 'A'}, {'sort_order': -1}, {'sort_order': 10001}, {'is_active': 1}, {'name': ' '}, {'parent_id': 'missing'}]:
        assert client.post('/api/v1/admin/categories', headers=auth, json={**body, **extra}).status_code == 422
    response = client.post('/api/v1/admin/categories', headers=auth, json=body)
    assert response.status_code == 201
    row = response.json()
    update = {'name': 'Edited', 'sort_order': 0, 'is_active': True, 'version': 0}
    for extra in [{'parent_id': 'tops'}, {'code': 'EDIT'}]:
        assert client.put('/api/v1/admin/categories/' + row['id'], headers=auth, json={**update, **extra}).status_code == 422
    assert client.put('/api/v1/admin/categories/' + row['id'], headers=auth, json=update).status_code == 200
