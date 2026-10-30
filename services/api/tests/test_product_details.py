import json
import sqlite3

import pytest
from pydantic import ValidationError

from app.inventory import ProductCreate
from test_inventory import setup, snapshot, AUTH, BASE
from test_public_catalog import prepared, publish

EMPTY = dict(material_info='', care_instructions='', measurement_note='', measurements=[])
DETAILS = dict(material_info=' 면 100% ', care_instructions=' 찬물 손세탁 ',
               measurement_note=' 단면 기준 ', measurements=[dict(size=' M ', label=' 가슴 ', value_cm=51.125)])
BODY = dict(name='합성 상품', category_id='tops-tee', seasons=['SP'])


def test_details_roundtrip_omission_clear_and_atomic_conflict(setup):
    client, _, make_client = setup
    pid, _, _ = prepared(client)
    before = snapshot(client)
    version = before['products'][0]['version']
    url = BASE + '/products/' + pid
    response = client.put(url, headers=AUTH, json=BODY | dict(version=version, details=DETAILS))
    assert response.status_code == 200
    expected = dict(material_info='면 100%', care_instructions='찬물 손세탁', measurement_note='단면 기준',
                    measurements=[dict(size='M', label='가슴', value_cm=51.125)])
    assert response.json()['details'] == expected
    assert snapshot(make_client())['products'][0]['details'] == expected
    assert client.put(url, headers=AUTH, json=BODY | dict(version=version, details={})).status_code == 409
    assert client.put(url, headers=AUTH, json=BODY | dict(version=version+1)).json()['details'] == expected
    assert client.put(url, json=BODY | dict(version=version+2, details={})).status_code == 401
    assert client.put(BASE+'/products/missing', headers=AUTH, json=BODY | dict(version=0, details={})).status_code == 404
    after = snapshot(client)
    assert after['skus'] == before['skus'] and after['movements'] == before['movements']
    assert client.put(url, headers=AUTH, json=BODY | dict(version=version+2, description='public', details=expected)).status_code == 200
    assert publish(client, pid).status_code == 200
    public = client.get('/api/v1/products/'+pid).json()
    assert public['details'] == expected and public['price'] == 12000
    assert 'internal_name' not in public and 'version' not in public
    assert client.get('/api/v1/products').json()['products'][0]['details'] == expected
    assert client.put(url, headers=AUTH, json=BODY | dict(version=version+3, description='public', details={})).json()['details'] == EMPTY
    assert client.get('/api/v1/products/'+pid).json()['details'] == EMPTY


@pytest.mark.parametrize('details', [None, {'extra':1}, {'material_info':'x'*1001},
    {'care_instructions':'x'*2001}, {'measurement_note':'x'*1001}, {'material_info':42},
    {'measurements':[dict(size='M',label='chest',value_cm=1)]*101},
    {'measurements':[dict(size=' M ',label='Chest',value_cm=1),dict(size='m',label=' chest ',value_cm=2)]},
    *[{'measurements':[dict(size='M',label='chest',value_cm=value)]} for value in [True,'12',0,-1,500.01]],
    *[{'measurements':[dict(size='M',label='chest',value_cm=1)|patch]} for patch in
      [{'size':''},{'size':' '*3},{'size':'x'*41},{'label':''},{'label':'x'*61},{'extra':1}]]])
def test_invalid_details_rejected_without_mutation(setup, details):
    client, _, _ = setup
    before = snapshot(client)
    assert client.post(BASE+'/products', headers=AUTH, json=BODY | dict(details=details)).status_code == 422
    assert snapshot(client) == before


@pytest.mark.parametrize('value', [float('nan'), float('inf'), -float('inf')])
def test_nonfinite_measurement_rejected(value):
    with pytest.raises(ValidationError):
        ProductCreate.model_validate(BODY | dict(details={'measurements':[dict(size='M',label='chest',value_cm=value)]}))


@pytest.mark.parametrize('value', [float('nan'), float('inf'), -float('inf')])
def test_nonfinite_wire_request_rejected(setup, value):
    client, _, _ = setup
    response = client.post(BASE+'/products', headers=AUTH | {'Content-Type':'application/json'},
                           content=json.dumps(BODY | dict(details={'measurements':[dict(size='M',label='chest',value_cm=value)]})))
    assert response.status_code == 422


def test_defaults_and_upper_bounds(setup):
    client, _, _ = setup
    assert client.post(BASE+'/products', headers=AUTH, json=BODY).json()['details'] == EMPTY
    details = dict(material_info='x'*1000, care_instructions='x'*2000, measurement_note='x'*1000,
                   measurements=[dict(size='x'*40,label=str(i)+'x'*57,value_cm=500) for i in range(100)])
    response = client.post(BASE+'/products', headers=AUTH, json=BODY | dict(details=details))
    assert response.status_code == 201 and response.json()['details'] == details


def test_schema16_backup_and_additive_migration(setup):
    client, path, _ = setup
    pid, _, _ = prepared(client)
    assert publish(client, pid).status_code == 200
    before = snapshot(client)
    with sqlite3.connect(path) as db:
        if 'details' in [r[1] for r in db.execute('PRAGMA table_info(products)')]:
            db.execute('ALTER TABLE products DROP COLUMN details')
        db.execute('PRAGMA user_version=16')
        old = {table:db.execute('SELECT * FROM '+table).fetchall() for table in
               ['products','skus','movements','product_publications','publication_history']}
    after = snapshot(client)
    assert after['products'][0]['details'] == EMPTY
    assert after == before
    with sqlite3.connect(path) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 17
        assert [r[:-1] for r in db.execute('SELECT * FROM products')] == old['products']
        for table in ['skus','movements','product_publications','publication_history']:
            assert db.execute('SELECT * FROM '+table).fetchall() == old[table]
    backups = list(path.parent.glob(path.name+'.pre-v17-*.bak'))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 16
        assert db.execute('SELECT * FROM products').fetchall() == old['products']
    snapshot(client)
    assert len(list(path.parent.glob(path.name+'.pre-v17-*.bak'))) == 1
