from concurrent.futures import ThreadPoolExecutor
import sqlite3
from threading import Barrier

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest

from app.inventory import CatalogStore, ProductCreate, SkuBatchCreate, OptionValueUpdate
from app.main import create_app
from option_helpers import option


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setenv('STORE_ADMIN_TOKEN', 'batch-test-only')
    store = CatalogStore(tmp_path / 'db')
    product = store.create_product(ProductCreate(name='Batch', category_id='tops-tee', seasons=['SP']))
    colors = [option(store, 'color', f'Color {i}', f'C{i}')['id'] for i in range(2)]
    sizes = [option(store, 'size', f'Size {i}', f'S{i}')['id'] for i in range(2)]
    body = SkuBatchCreate(product_id=product['id'], color_ids=colors, size_ids=sizes, reorder_point=5)
    client = TestClient(create_app(env_file=tmp_path / 'missing', catalog_path=store.path))
    return store, body, client


def test_cartesian_create_retry_and_existing_unchanged(setup):
    store, body, _ = setup
    first = store.create_sku_batch(SkuBatchCreate(**{**body.model_dump(), 'color_ids': body.color_ids[:1], 'size_ids': body.size_ids[:1]}))
    assert len(first['created']) == 1
    result = store.create_sku_batch(body)
    assert len(result['created']) == 3 and result['existing'] == first['created']
    assert {(s['color_id'], s['size_id']) for s in result['created'] + result['existing']} == {(c, s) for c in body.color_ids for s in body.size_ids}
    assert all(s['on_hand'] == s['version'] == 0 for s in result['created'])
    before = store.get()
    retry = store.create_sku_batch(SkuBatchCreate(**{**body.model_dump(), 'reorder_point': 99}))
    assert retry['created'] == [] and len(retry['existing']) == 4
    assert all(s['reorder_point'] == 5 for s in retry['existing'])
    assert store.get() == before


@pytest.mark.parametrize('extra', [
    {'color_ids': []}, {'size_ids': []}, {'color_ids': ['x'] * 2},
    {'size_ids': ['x', ' x ']}, {'color_ids': [str(i) for i in range(51)]},
    {'size_ids': [str(i) for i in range(51)]}, {'color_ids': ['x'] * 1, 'size_ids': [True]},
    {'color_ids': [' ']}, {'size_ids': ['x' * 65]}, {'reorder_point': True},
    {'color_ids': [str(i) for i in range(5)], 'size_ids': [str(i) for i in range(41)]},
])
def test_http_strict_bounds(setup, extra):
    store, body, client = setup
    response = client.post('/api/v1/admin/skus/batch', headers={'Authorization': 'Bearer batch-test-only'}, json={**body.model_dump(), **extra})
    assert response.status_code == 422
    assert store.get()['skus'] == []


def test_http_auth_success_and_maximum_200(setup):
    store, body, client = setup
    url = '/api/v1/admin/skus/batch'
    assert client.post(url, json=body.model_dump()).status_code == 401
    assert client.post(url, headers={'Authorization': 'Bearer bad'}, json=body.model_dump()).status_code == 401
    response = client.post(url, headers={'Authorization': 'Bearer batch-test-only'}, json=body.model_dump())
    assert response.status_code == 200 and len(response.json()['created']) == 4
    sizes = [option(store, 'size', f'Limit {i}', f'L{i}')['id'] for i in range(50)]
    colors = [option(store, 'color', f'Limit {i}', f'L{i}')['id'] for i in range(4)]
    result = store.create_sku_batch(SkuBatchCreate(product_id=body.product_id, color_ids=colors, size_ids=sizes, reorder_point=0))
    assert len(result['created']) == 200


@pytest.mark.parametrize('scenario', ['missing', 'wrong_kind', 'inactive'])
def test_all_references_validated_before_write(setup, scenario):
    store, body, _ = setup
    values = body.model_dump()
    if scenario == 'missing':
        values['size_ids'] += ['missing']
    elif scenario == 'wrong_kind':
        values['size_ids'] += [body.color_ids[0]]
    else:
        value = next(v for v in store.get()['option_values'] if v['id'] == body.size_ids[-1])
        store.update_option_value(value['id'], OptionValueUpdate(name=value['name'], sort_order=0, is_active=False, version=0))
    before = store.get()
    with pytest.raises(HTTPException) as error:
        store.create_sku_batch(SkuBatchCreate(**values))
    assert error.value.status_code == (404 if scenario == 'missing' else 422)
    assert store.get() == before


def test_late_code_collision_rolls_back_all_new_combinations(setup):
    store, body, _ = setup
    other = store.create_product(ProductCreate(name='Other', category_id='tops-tee', seasons=['SP']))
    foreign = store.create_sku_batch(SkuBatchCreate(product_id=other['id'], color_ids=body.color_ids[:1], size_ids=body.size_ids[:1], reorder_point=0))['created'][0]
    internal = next(p['internal_name'] for p in store.get()['products'] if p['id'] == body.product_id)
    collision = internal + '-C1-S1'
    with sqlite3.connect(store.path) as db:
        db.execute('UPDATE skus SET code=?,code_key=? WHERE id=?', (collision, collision.casefold(), foreign['id']))
    before = store.get()
    with pytest.raises(HTTPException) as error:
        store.create_sku_batch(body)
    assert error.value.status_code == 409
    assert store.get() == before


def test_concurrent_retry_creates_each_combination_once(setup):
    store, body, _ = setup
    gate = Barrier(2)
    def attempt(_):
        gate.wait(timeout=5)
        return CatalogStore(store.path).create_sku_batch(body)
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, range(2)))
    assert sorted(len(r['created']) for r in results) == [0, 4]
    assert sorted(len(r['existing']) for r in results) == [0, 4]
    assert len(store.get()['skus']) == 4
