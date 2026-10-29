import pytest
from app.inventory import SupplierCreate
from test_movement_reasons import setup

AUTH = {'Authorization': 'Bearer reason-test-only'}
URL = '/api/v1/admin/suppliers'

@pytest.mark.parametrize('field', ['phone', 'contact_phone'])
@pytest.mark.parametrize('value', ['', '02-123-4567', '010-1234-5678', '+123 456 789 012 345'])
def test_phone_boundaries_accept_create_update(setup, field, value):
    store, _, client = setup
    created = client.post(URL, headers=AUTH, json={'name': 'Phone boundary', 'is_active': True, field: value})
    assert created.status_code == 201
    row = created.json()
    assert row[field] == value
    changed = client.put(f"{URL}/{row['id']}", headers=AUTH, json={'name': row['name'], 'is_active': True, 'version': 0, field: value})
    assert changed.status_code == 200
    assert changed.json()[field] == value

@pytest.mark.parametrize('field', ['phone', 'contact_phone'])
@pytest.mark.parametrize('value', ['010123456789', '+1234567890123456', '++821012345678', '010+12345678', '+', '(). -', '１２３'])
def test_phone_invalid_create_update_no_mutation(setup, field, value):
    store, _, client = setup
    assert client.post(URL, headers=AUTH, json={'name': 'Invalid', 'is_active': True, field: value}).status_code == 422
    assert store.get()['suppliers'] == []
    row = store.create_supplier(SupplierCreate(name='Existing', is_active=True, phone='010-1234-5678'))
    before = store.get()
    assert client.put(f"{URL}/{row['id']}", headers=AUTH, json={'name': 'Changed', 'is_active': True, 'version': 0, field: value}).status_code == 422
    assert store.get() == before


def test_phone_legacy_omission_preserved_explicit_clear(setup):
    store, _, client = setup
    row = store.create_supplier(SupplierCreate(name='Legacy', is_active=True))
    with store.transaction() as db:
        db.execute('UPDATE suppliers SET phone=?, contact_phone=? WHERE id=?', ('1' * 20, '2' * 20, row['id']))
    changed = client.put(f"{URL}/{row['id']}", headers=AUTH, json={'name': 'Renamed', 'is_active': True, 'version': 0})
    assert changed.status_code == 200
    assert changed.json()['phone'] == '1' * 20 and changed.json()['contact_phone'] == '2' * 20
    cleared = client.put(f"{URL}/{row['id']}", headers=AUTH, json={'name': 'Renamed', 'is_active': True, 'version': 1, 'phone': '', 'contact_phone': ''})
    assert cleared.status_code == 200
    assert cleared.json()['phone'] == cleared.json()['contact_phone'] == ''

