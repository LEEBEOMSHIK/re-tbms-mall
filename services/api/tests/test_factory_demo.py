import importlib.util
import json
from pathlib import Path

import pytest
from app.factory import FactoryLogin, FactoryStore, FactoryStatus
from app.inventory import CatalogStore, ProductCreate

spec = importlib.util.spec_from_file_location('seed_factory_demo', Path(__file__).parents[1] / 'scripts/seed_factory_demo.py')
demo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(demo)


def test_demo_repeat_preserves_existing_records_and_progress(tmp_path):
    database, credentials = tmp_path / 'catalog.sqlite3', tmp_path / 'credentials.json'
    store = CatalogStore(database)
    original = store.create_product(ProductCreate(name='Existing product', category_id='tops-tee', seasons=['SP']))
    result = demo.seed(database, credentials, local_demo=True)
    assert result['created'] is True
    secret_bytes = credentials.read_bytes()
    login = FactoryStore(store).login(FactoryLogin(**json.loads(secret_bytes)), 'local-test')
    factory = FactoryStore(store)
    workspace = factory.workspace(login['token'])
    assert len(workspace['products']) == len(workspace['requests']) == 1
    assert workspace['products'][0]['id'] == result['product_id']
    assert original in [{k:v for k,v in p.items() if not k.startswith('publication_')} for p in store.get()['products']]
    assert workspace['requests'][0]['lines'][0]['quantity'] == 10
    images = factory.images(result['product_id'], login['token'])
    assert len(images['images']) == 1 and images['images'][0]['name'] == '[테스트] 공유 시안'
    assert all('on_hand' not in sku for sku in workspace['products'][0]['skus'])
    factory.status(result['request_id'], FactoryStatus(status='accepted', version=0), login['token'])
    before = store.get()
    assert demo.seed(database, credentials, local_demo=True)['created'] is False
    assert credentials.read_bytes() == secret_bytes and store.get() == before
    assert factory.workspace(login['token'])['requests'][0]['status'] == 'accepted'


def test_demo_requires_explicit_flag_and_does_not_overwrite_bad_credentials(tmp_path):
    database, credentials = tmp_path / 'catalog.sqlite3', tmp_path / 'credentials.json'
    with pytest.raises(ValueError):
        demo.seed(database, credentials, local_demo=False)
    assert not credentials.exists() and not database.exists()
    credentials.write_text('{"username":"existing.user","password":"do-not-overwrite"}')
    before = credentials.read_bytes()
    with pytest.raises(ValueError):
        demo.seed(database, credentials, local_demo=True)
    assert credentials.read_bytes() == before and not database.exists()


def test_demo_domain_failure_rolls_back_all_seed_rows(tmp_path, monkeypatch):
    database, credentials = tmp_path / 'catalog.sqlite3', tmp_path / 'credentials.json'
    before = CatalogStore(database).get()
    def fail(*args):
        raise RuntimeError('Synthetic failure')
    monkeypatch.setattr(demo.ProductImageStore, 'create', fail)
    with pytest.raises(RuntimeError):
        demo.seed(database, credentials, local_demo=True)
    assert CatalogStore(database).get() == before
    assert FactoryStore(CatalogStore(database)).admin_workspace()['accounts'] == []


def test_changed_demo_password_or_identity_is_not_reset(tmp_path):
    database, credentials = tmp_path / 'catalog.sqlite3', tmp_path / 'credentials.json'
    demo.seed(database, credentials, local_demo=True)
    value = json.loads(credentials.read_text())
    value['password'] = 'changed-' * 8
    credentials.write_text(json.dumps(value))
    before = CatalogStore(database).get()
    with pytest.raises(ValueError):
        demo.seed(database, credentials, local_demo=True)
    assert CatalogStore(database).get() == before
