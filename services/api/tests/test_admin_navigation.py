from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import json
import sqlite3

from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest

from app.admin_navigation import AdminNavigationStore, DEFAULT_GROUPS, MENU_IDS, NavigationState

URL = '/api/v1/admin/navigation'
AUTH = {'Authorization': 'Bearer synthetic-navigation-test'}


@pytest.fixture
def setup(tmp_path, monkeypatch):
    import app.main as main
    monkeypatch.setattr(main, 'load_admin_token', lambda _: 'synthetic-navigation-test')
    monkeypatch.setattr(main, 'load_cors_origins', lambda _: [])
    def fresh():
        return TestClient(main.create_app(env_file=tmp_path / 'absent.env', catalog_path=tmp_path / 'catalog.sqlite3', storefront_path=tmp_path / 'store.json', design_path=tmp_path / 'design.sqlite3', customer_path=tmp_path / 'customer.sqlite3', brand_about_path=tmp_path / 'brand.sqlite3'))
    return fresh(), fresh, tmp_path


def initial():
    return {'revision': 0, 'groups': deepcopy(DEFAULT_GROUPS)}


def test_auth_and_default_read_are_private_and_do_not_create_storage(setup):
    client, _, path = setup
    for method in ['get', 'put']:
        assert getattr(client, method)(URL).status_code == 401
        assert getattr(client, method)(URL, headers={'Authorization': 'Bearer wrong'}).status_code == 401
    response = client.get(URL, headers=AUTH)
    assert response.status_code == 200
    assert response.json() == initial()
    assert response.headers['cache-control'] == 'no-store'
    assert not (path / 'admin-navigation.sqlite3').exists()


def test_reorder_rename_move_hide_restart_and_conflict(setup):
    client, fresh, path = setup
    value = initial()
    value['groups'][0]['label'] = '  운영 관리  '
    value['groups'][0]['visible'] = False
    moved = value['groups'][0]['items'].pop(0)
    moved['visible'] = False
    value['groups'][1]['items'].append(moved)
    value['groups'].reverse()
    response = client.put(URL, headers=AUTH, json=value)
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'
    saved = response.json()
    assert saved['revision'] == 1
    assert saved['groups'][-1]['label'] == '운영 관리'
    assert saved['groups'][-1]['visible'] is False
    assert saved['groups'][2]['items'][-1] == {'id': 'home', 'visible': False}
    assert fresh().get(URL, headers=AUTH).json() == saved
    conflict = client.put(URL, headers=AUTH, json=value)
    assert conflict.status_code == 409
    assert client.get(URL, headers=AUTH).json() == saved
    assert not (path / 'catalog.sqlite3').exists()


def test_hiding_everything_does_not_remove_endpoints_or_recovery(setup):
    client, _, _ = setup
    value = initial()
    for group in value['groups']:
        group['visible'] = False
        for item in group['items']:
            item['visible'] = False
    saved = client.put(URL, headers=AUTH, json=value).json()
    assert saved['revision'] == 1
    assert client.get('/api/v1/admin/brand-about', headers=AUTH).status_code == 200
    assert client.get('/api/v1/admin/brand-about').status_code == 401
    assert client.get(URL, headers=AUTH).json() == saved
    restored = initial()
    restored['revision'] = saved['revision']
    assert client.put(URL, headers=AUTH, json=restored).json()['revision'] == 2


@pytest.mark.parametrize('mutation', [
    lambda v: v['groups'].clear(),
    lambda v: v['groups'].extend([{'id': f'x{i}', 'label': 'extra', 'visible': True, 'items': []} for i in range(5)]),
    lambda v: v['groups'][0]['items'].pop(),
    lambda v: v['groups'][1]['items'].append(deepcopy(v['groups'][0]['items'][0])),
    lambda v: v['groups'][0]['items'][0].update(id='external'),
    lambda v: v['groups'][0]['items'][0].update(href='https://evil.test'),
    lambda v: v['groups'][1].update(id=v['groups'][0]['id']),
    lambda v: v['groups'][0].update(id='../unsafe'),
    lambda v: v['groups'][0].update(id=' operations '),
    lambda v: v['groups'][0]['items'][0].update(id=' home '),
    lambda v: v['groups'][0].update(id='x' * 65),
    lambda v: v['groups'][0].update(label='  '),
    lambda v: v['groups'][0].update(label='가' * 41),
    lambda v: v['groups'][0].update(visible='false'),
    lambda v: v['groups'][0]['items'][0].update(visible=1),
    lambda v: v.update(revision=True),
    lambda v: v.update(revision=-1),
    lambda v: v.update(revision=0.0),
    lambda v: v.update(revision='0'),
    lambda v: v.update(extra=True),
])
def test_rejected_payload_does_not_mutate_state(setup, mutation):
    client, _, _ = setup
    value = initial()
    mutation(value)
    assert client.put(URL, headers=AUTH, json=value).status_code == 422
    assert client.get(URL, headers=AUTH).json() == initial()


def test_group_label_boundary_and_empty_group(setup):
    client, _, _ = setup
    value = initial()
    value['groups'][0]['label'] = '😀' * 40
    value['groups'].append({'id': 'empty', 'label': '새 그룹', 'visible': True, 'items': []})
    response = client.put(URL, headers=AUTH, json=value)
    assert response.status_code == 200
    assert response.json()['groups'][0]['label'] == '😀' * 40
    saved = response.json()
    saved['groups'].pop()
    assert client.put(URL, headers=AUTH, json=saved).status_code == 200


def test_request_body_bounds_count_streamed_bytes_and_preserve_state(setup):
    client, _, _ = setup
    assert client.put(URL, headers=AUTH, content=b'x' * (32 * 1024 + 1)).status_code == 413
    raw = json.dumps(initial()).encode()
    # Exactly 32 KiB is accepted; JSON trailing whitespace is legitimate.
    accepted = client.put(URL, headers=AUTH, content=raw + b' ' * (32 * 1024 - len(raw)))
    assert accepted.status_code == 200
    assert client.put(URL, headers=AUTH, content=b'{invalid').status_code == 422
    assert client.get(URL, headers=AUTH).json()['revision'] == 1


def test_storage_failure_and_corrupt_content_are_not_default_success(tmp_path):
    blocked = tmp_path / 'directory'
    blocked.mkdir()
    with pytest.raises(HTTPException) as error:
        AdminNavigationStore(blocked).save(NavigationState.model_validate(initial()))
    assert error.value.status_code == 503
    path = tmp_path / 'bad.sqlite3'
    store = AdminNavigationStore(path)
    store.save(NavigationState.model_validate(initial()))
    with sqlite3.connect(path) as db:
        db.execute('UPDATE admin_navigation SET state=?', ('{"revision":1,"groups":[]}',))
    with pytest.raises(HTTPException) as error:
        store.get()
    assert error.value.status_code == 503


def test_concurrent_writers_cannot_overwrite_same_revision(tmp_path):
    path = tmp_path / 'concurrent.sqlite3'
    def save(label):
        value = initial()
        value['groups'][0]['label'] = label
        try:
            return AdminNavigationStore(path).save(NavigationState.model_validate(value))
        except HTTPException as error:
            return error.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(save, ['one', 'two']))
    assert len([value for value in outcomes if value == 409]) == 1
    saved = AdminNavigationStore(path).get()
    assert saved['revision'] == 1
    assert saved in outcomes
    assert {item['id'] for group in saved['groups'] for item in group['items']} == MENU_IDS


def legacy_state():
    value = initial()
    for group in value['groups']:
        group['items'] = [item for item in group['items'] if item['id'] != 'payment-preparation']
    return value


def test_legacy_read_adds_payment_menu_without_overwriting_customization(tmp_path):
    path = tmp_path / 'legacy.sqlite3'
    old = legacy_state()
    old['revision'] = 7
    old['groups'].reverse()
    old['groups'][0]['id'] = 'custom-project'
    old['groups'][0]['label'] = '준비 업무'
    old['groups'][0]['visible'] = False
    old['groups'][0]['items'][0]['visible'] = False
    raw = json.dumps(old, ensure_ascii=False)
    with sqlite3.connect(path) as db:
        db.execute('CREATE TABLE admin_navigation (id INTEGER PRIMARY KEY, state TEXT NOT NULL)')
        db.execute('INSERT INTO admin_navigation VALUES (1, ?)', (raw,))
    actual = AdminNavigationStore(path).get()
    expected = deepcopy(old)
    expected['groups'][0]['items'].append({'id': 'payment-preparation', 'visible': True})
    assert actual == expected
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT state FROM admin_navigation').fetchone()[0] == raw
    saved = AdminNavigationStore(path).save(NavigationState.model_validate(actual))
    assert saved['revision'] == 8
    assert AdminNavigationStore(path).get() == saved


def test_legacy_client_write_is_rejected_without_mutation(setup):
    client, _, _ = setup
    assert client.put(URL, headers=AUTH, json=legacy_state()).status_code == 422
    assert client.get(URL, headers=AUTH).json() == initial()


def test_incomplete_legacy_storage_is_not_silently_repaired(tmp_path):
    path = tmp_path / 'invalid-legacy.sqlite3'
    value = legacy_state()
    value['groups'][0]['items'].pop()
    with sqlite3.connect(path) as db:
        db.execute('CREATE TABLE admin_navigation (id INTEGER PRIMARY KEY, state TEXT NOT NULL)')
        db.execute('INSERT INTO admin_navigation VALUES (1, ?)', (json.dumps(value),))
    with pytest.raises(HTTPException) as error:
        AdminNavigationStore(path).get()
    assert error.value.status_code == 503


def test_all_nine_menus_can_share_one_group(setup):
    client, _, _ = setup
    value = initial()
    assert len(MENU_IDS) == 9
    items = [item for group in value['groups'] for item in group['items']]
    value['groups'] = [{'id': 'all', 'label': '전체', 'visible': True, 'items': items}]
    assert client.put(URL, headers=AUTH, json=value).status_code == 200
