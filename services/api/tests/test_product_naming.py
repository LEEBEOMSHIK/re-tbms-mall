from concurrent.futures import ThreadPoolExecutor
import sqlite3
from threading import Barrier

from fastapi import HTTPException
import pytest

from app.inventory import CatalogStore, ProductCreate, ProductUpdate, SCHEMA


def draft(category='tops-tee', name='고객용 이름'):
    return ProductCreate(name=name, category_id=category, seasons=['SP'])


def test_category_sequences_persistence_and_edit(tmp_path):
    path = tmp_path / 'catalog.sqlite3'
    store = CatalogStore(path)
    assert [(c['id'], c['code']) for c in store.get()['categories'] if c['parent_id'] is None] == [
        ('tops', 'TOP'), ('outer', 'OUT'), ('bottoms', 'BTM'), ('dresses', 'DRS'), ('other', 'ETC')]
    first = store.create_product(draft())
    assert first['internal_name'] == 'TOP-TEE-SP-000001'
    assert store.create_product(draft('outer-jacket'))['internal_name'] == 'OUT-JKT-SP-000001'
    assert CatalogStore(path).create_product(draft())['internal_name'] == 'TOP-TEE-SP-000002'
    edited = store.update_product(first['id'], ProductUpdate(name='새 이름', category_id='bottoms-denim', seasons=['SP'], version=0))
    assert edited['internal_name'] == first['internal_name']
    assert edited['name'] == '새 이름' and edited['category'] == '데님' and edited['version'] == 1
    assert store.create_product(draft('bottoms-denim'))['internal_name'] == 'BTM-DNM-SP-000001'


def test_sequence_never_reuses_and_expands(tmp_path):
    path = tmp_path / 'catalog.sqlite3'
    store = CatalogStore(path)
    first = store.create_product(draft())
    with sqlite3.connect(path) as db:
        db.execute('DELETE FROM products WHERE id=?', (first['id'],))
    assert store.create_product(draft())['internal_name'] == 'TOP-TEE-SP-000002'
    with sqlite3.connect(path) as db:
        db.execute("UPDATE product_name_sequences SET last_value=999999 WHERE category_id='tops-tee'")
    assert store.create_product(draft())['internal_name'] == 'TOP-TEE-SP-1000000'


def test_concurrent_allocations(tmp_path):
    path = tmp_path / 'catalog.sqlite3'
    gate = Barrier(4)
    def create(_):
        gate.wait(timeout=5)
        return CatalogStore(path).create_product(draft())['internal_name']
    with ThreadPoolExecutor(max_workers=4) as pool:
        assert sorted(pool.map(create, range(4))) == ['TOP-TEE-SP-000001', 'TOP-TEE-SP-000002', 'TOP-TEE-SP-000003', 'TOP-TEE-SP-000004']


def legacy_db(path):
    with sqlite3.connect(path) as db:
        for statement in SCHEMA:
            db.execute(statement)
        db.execute('PRAGMA user_version=1')
        for pid, category in [('p1', '상의'), ('p2', '상의'), ('p3', '빈티지'), ('p4', '빈티지'), ('p5', 'custom')]:
            db.execute('INSERT INTO products VALUES(?,?,?,?,?)', (pid, 'Name ' + pid, category, 'Description', 7))
        db.execute("INSERT INTO skus VALUES('s1','p1','SKU','sku','Black','black','M','m',2,5,3)")
        db.execute("INSERT INTO movements VALUES('m1','s1',5,'Count','local-admin','2026-01-01T00:00:00+00:00',5,'request','payload')")


def test_v1_migration_preserves_entities_and_order(tmp_path):
    path = tmp_path / 'catalog.sqlite3'
    legacy_db(path)
    with sqlite3.connect(path) as db:
        before_skus = db.execute('SELECT id,product_id,code,color,size,reorder_point,on_hand,version FROM skus').fetchall()
        before_movements = db.execute('SELECT id,sku_id,delta,reason,actor,created_at,balance_after,request_id,request_payload FROM movements').fetchall()
    store = CatalogStore(path)
    rows = store.get()['products']
    assert [p['id'] for p in rows] == ['p1', 'p2', 'p3', 'p4', 'p5']
    assert [p['internal_name'] for p in rows] == ['TOP-000001', 'TOP-000002', 'LEG001-000001', 'LEG001-000002', 'LEG002-000001']
    assert all(p['name'] == 'Name ' + p['id'] and p['version'] == 7 and p['description'] == 'Description' for p in rows)
    assert [p['category'] for p in rows[2:]] == ['빈티지', '빈티지', 'custom']
    assert store.create_product(draft())['internal_name'] == 'TOP-TEE-SP-000001'
    assert CatalogStore(path).get()['products'][:5] == rows
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 17
        assert db.execute('SELECT id,product_id,code,color,size,reorder_point,on_hand,version FROM skus').fetchall() == before_skus
        assert db.execute('SELECT id,sku_id,delta,reason,actor,created_at,balance_after,request_id,request_payload FROM movements').fetchall() == before_movements
        assert not db.execute('PRAGMA foreign_key_check').fetchall()


def test_failed_migration_rolls_back_all_changes(tmp_path):
    path = tmp_path / 'catalog.sqlite3'
    legacy_db(path)
    with sqlite3.connect(path) as db:
        db.execute("CREATE TRIGGER fail_migration BEFORE UPDATE ON products BEGIN SELECT RAISE(ABORT, 'test'); END")
    with pytest.raises(HTTPException) as error:
        CatalogStore(path).get()
    assert error.value.status_code == 503
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 1
        assert [r[1] for r in db.execute('PRAGMA table_info(products)')] == ['id', 'name', 'category', 'description', 'version']
        assert not db.execute("SELECT name FROM sqlite_master WHERE name='categories'").fetchall()
        assert db.execute("SELECT category FROM products WHERE id='p1'").fetchone()[0] == '상의'
        db.execute('DROP TRIGGER fail_migration')
    assert len(CatalogStore(path).get()['products']) == 5


def test_failed_insert_does_not_consume_sequence(tmp_path):
    path = tmp_path / 'catalog.sqlite3'
    store = CatalogStore(path)
    store.get()
    with sqlite3.connect(path) as db:
        db.execute("CREATE TRIGGER fail_product BEFORE INSERT ON products BEGIN SELECT RAISE(ABORT, 'test'); END")
    with pytest.raises(HTTPException):
        store.create_product(draft())
    with sqlite3.connect(path) as db:
        db.execute('DROP TRIGGER fail_product')
    assert store.create_product(draft())['internal_name'] == 'TOP-TEE-SP-000001'


def test_unknown_category_does_not_create_or_edit(tmp_path):
    store = CatalogStore(tmp_path / 'catalog.sqlite3')
    row = store.create_product(draft())
    with pytest.raises(HTTPException) as error:
        store.create_product(draft('missing'))
    assert error.value.status_code == 422
    with pytest.raises(HTTPException) as error:
        store.update_product(row['id'], ProductUpdate(name='N', category_id='missing', seasons=['SP'], version=0))
    assert error.value.status_code == 422
    assert [{k:v for k,v in p.items() if not k.startswith('publication_')} for p in store.get()['products']] == [row]


def test_migration_preserves_id_looking_free_labels(tmp_path):
    path = tmp_path / 'catalog.sqlite3'
    legacy_db(path)
    with sqlite3.connect(path) as db:
        db.execute("UPDATE products SET category='tops' WHERE id='p1'")
        db.execute("UPDATE products SET category='TOPS' WHERE id='p2'")
    rows = CatalogStore(path).get()['products']
    assert [p['category'] for p in rows[:2]] == ['tops', 'TOPS']
    assert [p['category_id'] for p in rows[:2]] == ['legacy-001', 'legacy-002']
    assert [p['internal_name'] for p in rows[:2]] == ['LEG001-000001', 'LEG002-000001']


@pytest.mark.parametrize('extra', [{'category': 'tops'}, {'internal_name': 'FORGED-000001'}])
def test_client_cannot_supply_free_category_or_internal_name(extra):
    with pytest.raises(ValueError):
        ProductCreate(name='N', category_id='tops', **extra)


