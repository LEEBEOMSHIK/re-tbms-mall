"""Self-service account security checks use isolated pytest SQLite fixtures."""
import pytest
from test_movement_reasons import setup
from test_factory import factory_setup, AUTH, PASSWORD

URL = '/api/v1/factory/profile'
NEW_PASSWORD = 'Synthetic-New-Password-456'


def test_profile_auth_scope_and_update(factory_setup):
    store, sku, client, supplier, other_supplier, accounts, tokens = factory_setup
    for headers in ({}, AUTH, {'Authorization': 'Bearer invalid'}):
        assert client.get(URL, headers=headers).status_code == 401
        assert client.put(URL, headers=headers, json={'display_name': 'New', 'version': 0}).status_code == 401
    initial = client.get(URL, headers=tokens[0])
    assert initial.status_code == 200 and initial.headers['cache-control'] == 'no-store'
    assert initial.json() == {'account': accounts[0], 'supplier_name': supplier['name']}
    response = client.put(URL, headers=tokens[0], json={'display_name': '  My Name  ', 'version': 0})
    assert response.status_code == 200
    saved = response.json()['account']
    assert saved == {**accounts[0], 'display_name': 'My Name', 'version': 1}
    assert client.get(URL, headers=tokens[1]).json()['account'] == accounts[1]
    assert client.get(URL, headers=tokens[0]).json()['account'] == saved
    assert client.put(URL, headers=tokens[0], json={'display_name': 'Lost update', 'version': 0}).status_code == 409
    assert PASSWORD not in response.text and 'password_hash' not in response.text
    assert client.get('/api/v1/factory/workspace', headers=tokens[0]).json()['account'] == saved


@pytest.mark.parametrize('patch', [
    {'username': 'changed'}, {'supplier_id': 'other'}, {'id': 'other'}, {'is_active': False}, {'role': 'admin'},
    {'display_name': '  '}, {'display_name': 'x' * 81}, {'version': True}, {'version': -1},
    {'current_password': PASSWORD}, {'new_password': NEW_PASSWORD}, {'current_password': None, 'new_password': None},
    {'current_password': PASSWORD, 'new_password': 'short'}, {'current_password': PASSWORD, 'new_password': ' ' * 12},
])
def test_profile_invalid_input_preserves_account(factory_setup, patch):
    _, _, client, _, _, accounts, tokens = factory_setup
    response = client.put(URL, headers=tokens[0], json={'display_name': 'Changed', 'version': 0, **patch})
    assert response.status_code == 422
    assert PASSWORD not in response.text and NEW_PASSWORD not in response.text
    assert client.get(URL, headers=tokens[0]).json()['account'] == accounts[0]


def test_password_verification_and_other_session_revocation(factory_setup):
    _, _, client, _, _, accounts, tokens = factory_setup
    second = client.post('/api/v1/factory/login', json={'username': 'factory.a', 'password': PASSWORD}).json()
    second_auth = {'Authorization': 'Bearer ' + second['token']}
    body = {'display_name': 'Updated', 'version': 0, 'current_password': 'wrong', 'new_password': NEW_PASSWORD}
    response = client.put(URL, headers=tokens[0], json=body)
    assert response.status_code == 422
    assert client.get(URL, headers=tokens[0]).json()['account'] == accounts[0]
    response = client.put(URL, headers=tokens[0], json={**body, 'current_password': PASSWORD})
    assert response.status_code == 200 and response.json()['account']['version'] == 1
    assert client.get(URL, headers=tokens[0]).status_code == 200
    assert client.get(URL, headers=second_auth).status_code == 401
    assert client.get(URL, headers=tokens[1]).status_code == 200
    assert client.post('/api/v1/factory/login', json={'username': 'factory.a', 'password': PASSWORD}).status_code == 401
    assert client.post('/api/v1/factory/login', json={'username': 'factory.a', 'password': NEW_PASSWORD}).status_code == 200
    assert 'password' not in response.text and 'token' not in response.text


def test_password_attempt_limit_does_not_lock_profile_read_or_name_edit(factory_setup):
    store, _, client, _, _, accounts, tokens = factory_setup
    body = {'display_name': 'Changed', 'version': 0, 'current_password': 'wrong', 'new_password': NEW_PASSWORD}
    for _ in range(5):
        assert client.put(URL, headers=tokens[0], json=body).status_code == 422
    blocked = client.put(URL, headers=tokens[0], json={**body, 'current_password': PASSWORD})
    assert blocked.status_code == 429 and blocked.headers['retry-after'] == '900'
    assert client.get(URL, headers=tokens[0]).json()['account'] == accounts[0]
    assert client.put(URL, headers=tokens[0], json={'display_name': 'Only name', 'version': 0}).status_code == 200
    with store.transaction() as db:
        db.execute('UPDATE factory_login_limits SET started_at=0')
    assert client.put(URL, headers=tokens[0], json={**body, 'version': 1, 'current_password': PASSWORD}).status_code == 200


def test_disabled_account_and_inactive_supplier_cannot_edit(factory_setup):
    store, _, client, supplier, _, accounts, tokens = factory_setup
    with store.transaction() as db:
        db.execute('UPDATE factory_accounts SET is_active=0 WHERE id=?', (accounts[0]['id'],))
    assert client.put(URL, headers=tokens[0], json={'display_name': 'Changed', 'version': 0}).status_code == 401
    with store.transaction() as db:
        db.execute('UPDATE factory_accounts SET is_active=1 WHERE id=?', (accounts[0]['id'],))
        db.execute('UPDATE suppliers SET is_active=0 WHERE id=?', (supplier['id'],))
    assert client.put(URL, headers=tokens[0], json={'display_name': 'Changed', 'version': 0}).status_code == 401
