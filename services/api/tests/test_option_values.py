from concurrent.futures import ThreadPoolExecutor
import sqlite3
from threading import Barrier

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest

from app.inventory import CatalogStore, OptionValueCreate, OptionValueUpdate, ProductCreate, SkuCreate, migrate_v2_to_v3
from app.main import create_app
from test_categories_seasons import v2_db
from option_helpers import option, sku_body


def create(kind='color', name='Black', code='BLK'):
    return OptionValueCreate(kind=kind, name=name, code=code, is_active=True, sort_order=0)


def test_domains_unique_per_kind_and_rename_snapshots(tmp_path):
    store = CatalogStore(tmp_path / 'db')
    assert store.get()['option_values'] == []
    product = store.create_product(ProductCreate(name='N', category_id='tops-tee', seasons=['SP']))
    body = sku_body(store, product['id'])
    sku = store.create_sku(body)
    assert sku['code'] == product['internal_name'] + '-BLK-SM'
    color = next(v for v in store.get()['option_values'] if v['id'] == body.color_id)
    changed = store.update_option_value(color['id'], OptionValueUpdate(name='Ink', is_active=False, sort_order=5, version=0))
    assert changed['version'] == 1 and changed['code'] == 'BLK'
    assert store.get()['skus'] == [sku]
    with pytest.raises(HTTPException) as error:
        store.create_sku(body)
    assert error.value.status_code == 422
    with pytest.raises(HTTPException) as error:
        store.update_option_value(color['id'], OptionValueUpdate(name='N', is_active=True, sort_order=0, version=0))
    assert error.value.status_code == 409
    replacement = store.create_option_value(create(name='Black', code='BLACK2'))
    another = store.create_sku(SkuCreate(**{**body.model_dump(), 'color_id': replacement['id']}))
    assert another['color'] == sku['color'] and another['color_id'] != sku['color_id']
    for data in [create(name=' black ', code='OTHER'), create(name='Other', code='BLACK2')]:
        with pytest.raises(HTTPException) as error:
            store.create_option_value(data)
        assert error.value.status_code == 409
    assert store.create_option_value(create(kind='size', name='Black', code='BLACK2'))['kind'] == 'size'


def v3_db(path):
    v2_db(path)
    with sqlite3.connect(path) as db:
        db.row_factory = sqlite3.Row
        migrate_v2_to_v3(db)


def test_populated_migration_exact_public_data_and_ledger_preserved(tmp_path):
    path = tmp_path / 'db'
    v3_db(path)
    with sqlite3.connect(path) as db:
        db.execute("INSERT INTO skus VALUES('s2','p2','OtherSKU','othersku','BLACK','black','m','m',9,0,2)")
        before = db.execute('SELECT id,product_id,code,color,size,reorder_point,on_hand,version FROM skus ORDER BY rowid').fetchall()
        ledger = db.execute('SELECT id,sku_id,delta,reason,actor,created_at,balance_after,request_id,request_payload FROM movements').fetchall()
    data = CatalogStore(path).get()
    assert len(data['option_values']) == 2
    assert data['skus'][0]['color_id'] == data['skus'][1]['color_id']
    assert data['skus'][0]['size_id'] == data['skus'][1]['size_id']
    assert [v['code'] for v in data['option_values']] == ['C000001', 'S000001']
    assert CatalogStore(path).get() == data
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 17
        assert db.execute('SELECT id,product_id,code,color,size,reorder_point,on_hand,version FROM skus ORDER BY rowid').fetchall() == before
        assert db.execute('SELECT id,sku_id,delta,reason,actor,created_at,balance_after,request_id,request_payload FROM movements').fetchall() == ledger
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []


def test_migration_failure_rolls_back(tmp_path):
    path = tmp_path / 'db'
    v3_db(path)
    with sqlite3.connect(path) as db:
        before = db.execute('SELECT * FROM skus').fetchall()
        db.execute("CREATE TRIGGER fail_backfill BEFORE UPDATE ON skus BEGIN SELECT RAISE(ABORT,'test'); END")
    with pytest.raises(HTTPException) as error:
        CatalogStore(path).get()
    assert error.value.status_code == 503
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 3
        assert db.execute('SELECT * FROM skus').fetchall() == before
        assert not db.execute("SELECT name FROM sqlite_master WHERE name='option_values'").fetchall()
        db.execute('DROP TRIGGER fail_backfill')
    assert CatalogStore(path).get()['skus'][0]['color_id']


@pytest.mark.parametrize('kind', ['domain', 'sku'])
def test_concurrent_duplicate_is_serialized(tmp_path, kind):
    path = tmp_path / 'db'
    store = CatalogStore(path)
    product = store.create_product(ProductCreate(name='N', category_id='tops-tee', seasons=['SP']))
    body = sku_body(store, product['id'])
    gate = Barrier(2)
    def attempt(_):
        gate.wait(timeout=5)
        try:
            current = CatalogStore(path)
            if kind == 'domain':
                current.create_option_value(create(name='White', code='WHT'))
            else:
                current.create_sku(body)
            return 201
        except HTTPException as error:
            return error.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(attempt, range(2))) == [201, 409]


def test_derived_code_collision_and_long_code(tmp_path):
    path = tmp_path / 'db'
    store = CatalogStore(path)
    product = store.create_product(ProductCreate(name='N', category_id='tops-tee', seasons=['SP']))
    body = sku_body(store, product['id'])
    existing = store.create_sku(body)
    other = store.create_product(ProductCreate(name='Other', category_id='tops-tee', seasons=['SP']))
    second_body = SkuCreate(**{**body.model_dump(), 'product_id': other['id']})
    target = other['internal_name'] + '-BLK-SM'
    with sqlite3.connect(path) as db:
        db.execute('UPDATE skus SET code=?,code_key=? WHERE id=?', (target, target.casefold(), existing['id']))
    with pytest.raises(HTTPException) as error:
        store.create_sku(second_body)
    assert error.value.status_code == 409
    with sqlite3.connect(path) as db:
        db.execute('UPDATE products SET internal_name=? WHERE id=?', ('LEGACY' + 'X' * 80, other['id']))
    assert len(store.create_sku(second_body)['code']) > 64


def test_http_contract_auth_validation_and_missing_refs(tmp_path, monkeypatch):
    monkeypatch.setenv('STORE_ADMIN_TOKEN', 'synthetic-option-test')
    path = tmp_path / 'db'
    client = TestClient(create_app(env_file=tmp_path / 'missing', catalog_path=path))
    auth = {'Authorization': 'Bearer synthetic-option-test'}
    url = '/api/v1/admin/option-values'
    body = create().model_dump()
    assert client.post(url, json=body).status_code == 401
    assert client.put(url + '/missing', json={'name': 'N', 'is_active': True, 'sort_order': 0, 'version': 0}).status_code == 401
    for extra in [{'kind': 'other'}, {'code': 'lower'}, {'code': 'X' * 13}, {'name': ' '}, {'name': 'N' * 81}, {'sort_order': True}, {'sort_order': 10001}, {'is_active': 1}]:
        assert client.post(url, headers=auth, json={**body, **extra}).status_code == 422
    row = client.post(url, headers=auth, json=body).json()
    update = {'name': 'Renamed', 'is_active': True, 'sort_order': 0, 'version': 0}
    for extra in [{'kind': 'size'}, {'code': 'NEW'}, {'version': False}]:
        assert client.put(url + '/' + row['id'], headers=auth, json={**update, **extra}).status_code == 422
    assert client.put(url + '/missing', headers=auth, json=update).status_code == 404
    store = CatalogStore(path)
    product = store.create_product(ProductCreate(name='N', category_id='tops-tee', seasons=['SP']))
    size = option(store, 'size', 'M', 'M')
    sku = {'product_id': product['id'], 'color_id': row['id'], 'size_id': size['id'], 'reorder_point': 0}
    sku_url = '/api/v1/admin/skus'
    for extra in [{'code': 'FORGED'}, {'color': 'Free'}, {'size': 'Free'}, {'reorder_point': True}]:
        assert client.post(sku_url, headers=auth, json={**sku, **extra}).status_code == 422
    assert client.post(sku_url, headers=auth, json={**sku, 'color_id': size['id']}).status_code == 422
    assert client.post(sku_url, headers=auth, json={**sku, 'size_id': 'missing'}).status_code == 404
    assert client.post(sku_url, headers=auth, json=sku).status_code == 201
