from uuid import uuid4

from fastapi.testclient import TestClient

from app.inventory import CatalogStore, ProductCreate, SkuCreate, MovementCreate
from app.main import create_app
from option_helpers import sku_body


def test_current_stock_readiness_states_isolation_and_read_only(tmp_path, monkeypatch):
    monkeypatch.setenv('STORE_ADMIN_TOKEN', 'readiness-test-only')
    path = tmp_path / 'catalog.sqlite3'
    store = CatalogStore(path)
    products = [store.create_product(ProductCreate(name=f'Example {i}', category_id='tops-tee', seasons=['SP'])) for i in range(4)]
    skus = {}
    for i in range(1, 4):
        skus[i] = [store.create_sku(sku_body(store, products[i]['id'], str(j))) for j in range(2)]
    def move(sku, delta, version=0):
        store.move(MovementCreate(sku_id=sku['id'], delta=delta, version=version, reason='Synthetic test stock', request_id=str(uuid4())))
    move(skus[2][0], 3)
    move(skus[3][0], 4)
    move(skus[3][1], 2)
    client = TestClient(create_app(env_file=tmp_path / 'missing', catalog_path=path))
    url = '/api/v1/admin/catalog'
    assert client.get(url).status_code == 401
    assert client.get(url, headers={'Authorization': 'Bearer wrong'}).status_code == 401
    before = store.get()
    response = client.get(url, headers={'Authorization': 'Bearer readiness-test-only'})
    assert response.status_code == 200
    readiness = response.json()['product_readiness']
    assert readiness == [
        {'product_id': products[0]['id'], 'status': 'no_options', 'sku_count': 0, 'stocked_sku_count': 0, 'total_on_hand': 0},
        {'product_id': products[1]['id'], 'status': 'no_stock', 'sku_count': 2, 'stocked_sku_count': 0, 'total_on_hand': 0},
        {'product_id': products[2]['id'], 'status': 'partial_stock', 'sku_count': 2, 'stocked_sku_count': 1, 'total_on_hand': 3},
        {'product_id': products[3]['id'], 'status': 'in_stock', 'sku_count': 2, 'stocked_sku_count': 2, 'total_on_hand': 6},
    ]
    assert store.get() == before
    assert [{k:v for k,v in p.items() if not k.startswith('publication_')} for p in before['products']] == products
    move(skus[2][0], -3, version=1)
    after = store.get()
    assert after['product_readiness'][2] == {**readiness[2], 'status': 'no_stock', 'stocked_sku_count': 0, 'total_on_hand': 0}
    assert [after['product_readiness'][i] for i in [0, 1, 3]] == [readiness[i] for i in [0, 1, 3]]
    assert len(after['movements']) == 4
    assert store.get()['movements'] == after['movements']

