from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

ADMIN = '/api/v1/admin/storefront'
PUBLIC = '/api/v1/storefront'
AUTH = {'Authorization': 'Bearer test-only-key'}


@pytest.fixture
def setup(monkeypatch, tmp_path):
    monkeypatch.delenv('STORE_ADMIN_TOKEN', raising=False)
    env = tmp_path / '.env'
    env.write_text('STORE_ADMIN_TOKEN=test-only-key\n', encoding='utf-8')
    path = tmp_path / '.local' / 'storefront.json'
    return env, path


def client_for(setup):
    env, path = setup
    return TestClient(create_app(env_file=env, storefront_path=path, catalog_path=path.parent / "catalog.sqlite3"))


def payload(client):
    state = client.get(ADMIN, headers=AUTH).json()
    return {key: state[key] for key in ('revision', 'sections')}


def test_public_fixture(setup):
    response = client_for(setup).get(PUBLIC)
    assert response.status_code == 200
    data = response.json()
    assert data['products'] == []
    assert data['categories'] == []
    assert data['sections'] == []


@pytest.mark.parametrize('header', [{}, {'Authorization': 'Bearer wrong'}, {'Authorization': 'Basic test-only-key'}, {'Authorization': 'Bearer '}])
def test_admin_auth_required(setup, header):
    client = client_for(setup)
    assert client.get(ADMIN, headers=header).status_code == 401
    assert client.put(ADMIN, headers=header, json={'revision': 0, 'sections': []}).status_code == 401
    assert not setup[1].exists()


def test_missing_key_disables_admin(setup):
    setup[0].write_text('', encoding='utf-8')
    client = client_for(setup)
    assert client.get(PUBLIC).status_code == 200
    assert client.get(ADMIN, headers=AUTH).status_code == 503
    assert client.put(ADMIN, headers=AUTH, json={'revision': 0, 'sections': []}).status_code == 503


def test_process_key_overrides_file(setup, monkeypatch):
    monkeypatch.setenv('STORE_ADMIN_TOKEN', 'override')
    client = client_for(setup)
    assert client.get(ADMIN, headers=AUTH).status_code == 401
    assert client.get(ADMIN, headers={'Authorization': 'Bearer override'}).status_code == 200


def test_save_reload_order_hidden_and_conflict(setup):
    client = client_for(setup)
    body = payload(client)
    body['sections'].reverse()
    body['sections'][0]['title'] = '나만의 가을'
    body['sections'][0]['product_ids'] = []
    body['sections'][1]['enabled'] = False
    response = client.put(ADMIN, headers=AUTH, json=body)
    assert response.status_code == 200
    assert response.json()['revision'] == body['revision'] + 1
    saved = setup[1].read_bytes()
    assert client.put(ADMIN, headers=AUTH, json=body).status_code == 409
    assert setup[1].read_bytes() == saved
    reloaded = client_for(setup)
    assert reloaded.get(ADMIN, headers=AUTH).json() == response.json()
    public = reloaded.get(PUBLIC).json()
    assert public['sections'] == []


@pytest.mark.parametrize('change', [
    {'id': '../outside'}, {'id': ''}, {'id': 'a'*65}, {'title': ' '}, {'title': 'a'*81},
    {'subtitle': 'a'*201}, {'kind': 'unexpected'}, {'product_ids': ['missing']},
    {'product_ids': ['p001', 'p001']}, {'product_ids': ['p001']*13}, {'enabled': 'yes'},
    {'path': 'arbitrary.json'},
])
def test_invalid_section_does_not_write(setup, change):
    client = client_for(setup)
    body = payload(client)
    body['sections'][0].update(change)
    assert client.put(ADMIN, headers=AUTH, json=body).status_code == 422
    assert not setup[1].exists()


@pytest.mark.parametrize('case', ['duplicate', 'too_many', 'negative_revision', 'bool_revision', 'extra_field'])
def test_invalid_document(setup, case):
    client = client_for(setup)
    body = payload(client)
    if case == 'duplicate': body['sections'].append(deepcopy(body['sections'][0]))
    if case == 'too_many': body['sections'] = [{**body['sections'][0], 'id': f's{i}'} for i in range(21)]
    if case == 'negative_revision': body['revision'] = -1
    if case == 'bool_revision': body['revision'] = True
    if case == 'extra_field': body['path'] = 'elsewhere'
    assert client.put(ADMIN, headers=AUTH, json=body).status_code == 422
    assert not setup[1].exists()


def test_empty_sections_allowed(setup):
    client = client_for(setup)
    body = payload(client)
    body['sections'] = []
    assert client.put(ADMIN, headers=AUTH, json=body).status_code == 200
    assert client.get(PUBLIC).json()['sections'] == []


@pytest.mark.parametrize('corrupt', ['{bad json', '{"revision":0,"sections":[{}]}', 'x'*131073], ids=['json', 'schema', 'size'])
def test_corruption_returns_unavailable_without_reset(setup, corrupt):
    setup[1].parent.mkdir()
    setup[1].write_text(corrupt, encoding='utf-8')
    client = client_for(setup)
    assert client.get(PUBLIC).status_code == 503
    assert client.get(ADMIN, headers=AUTH).status_code == 503
    assert client.put(ADMIN, headers=AUTH, json={'revision': 0, 'sections': []}).status_code == 503
    assert setup[1].read_text(encoding='utf-8') == corrupt


def test_concurrent_writers_only_one_succeeds(setup):
    client = client_for(setup)
    body = payload(client)
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(lambda _: client.put(ADMIN, headers=AUTH, json=body).status_code, range(2)))
    assert sorted(statuses) == [200, 409]


def test_admin_cors_preflight(setup):
    client = client_for(setup)
    headers = {'Origin': 'http://localhost:3100', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type'}
    assert client.options(ADMIN, headers=headers).status_code == 200
    headers['Origin'] = 'https://untrusted.example'
    assert client.options(ADMIN, headers=headers).status_code == 400



def test_failed_atomic_replace_preserves_previous_settings(setup, monkeypatch):
    import app.storefront as storefront
    client = client_for(setup)
    body = payload(client)
    assert client.put(ADMIN, headers=AUTH, json=body).status_code == 200
    previous = setup[1].read_bytes()
    body = payload(client)
    body['sections'][0]['title'] = '저장 실패 시 유지'

    def fail_replace(*args):
        raise PermissionError('simulated locked file')

    monkeypatch.setattr(storefront.os, 'replace', fail_replace)
    assert client.put(ADMIN, headers=AUTH, json=body).status_code == 503
    assert setup[1].read_bytes() == previous
    assert list(setup[1].parent.glob('*.tmp')) == []


def test_invalid_update_preserves_existing_file(setup):
    client = client_for(setup)
    assert client.put(ADMIN, headers=AUTH, json=payload(client)).status_code == 200
    previous = setup[1].read_bytes()
    body = payload(client)
    body['sections'][0]['product_ids'] = ['not-a-product']
    assert client.put(ADMIN, headers=AUTH, json=body).status_code == 422
    assert setup[1].read_bytes() == previous


def test_empty_process_key_disables_file_key(setup, monkeypatch):
    monkeypatch.setenv('STORE_ADMIN_TOKEN', '')
    assert client_for(setup).get(ADMIN, headers=AUTH).status_code == 503
