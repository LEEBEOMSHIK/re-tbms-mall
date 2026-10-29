from copy import deepcopy
import pytest
from test_designs import client, create, save, asset, uid, PREFIX


def design(asset_id=None, **changes):
    value = dict(id=1, side='front', name='Print', art='type', size=40, horizontal=50, wrapHorizontal=100, vertical=50, angle=0)
    if asset_id:
        value.update(art='upload', asset_id=asset_id)
    value.update(changes)
    return value


def test_new_studio_roundtrip(client):
    r=create(client).json(); d=r['document']
    assert d['schema_version']==2
    d['studio']['designs']=[design(),design(id=2,side='back',wrapHorizontal=200)]
    d['studio']['activeId']=1
    d['studio']['settings'].update(garmentFit='male',garmentSize='XL',hoodFabric='brushed',fabric='wool')
    d['material_id']='wool'
    result=save(client,r['id'],d)
    assert result.status_code==200
    assert result.json()['document']==d
    assert client.get(f"{PREFIX}/{r['id']}").json()['document']==d
    assert save(client,r['id'],d).status_code==409


@pytest.mark.parametrize('mutation', [
    lambda d:d.update(studio=None),
    lambda d:d['studio']['settings'].update(sourceBlob='data:secret'),
    lambda d:d['studio']['settings'].update(wrinkles=1),
    lambda d:d['studio']['settings'].update(garmentSize='XXL'),
    lambda d:d['studio']['settings'].update(color='#ffffff'),
    lambda d:d['studio'].update(version=True),
    lambda d:d['studio'].update(designs=[design(id=True)]),
    lambda d:d['studio'].update(designs=[design(art='upload')]),
    lambda d:d['studio'].update(designs=[design(size=71)]),
    lambda d:d['studio'].update(designs=[design(wrapHorizontal=201)]),
    lambda d:d['studio'].update(designs=[design(),design()]),
    lambda d:d['studio'].update(designs=[design(id=i+1) for i in range(21)]),
    lambda d:d['studio'].update(designs=[design()],activeId=2),
    lambda d:d['studio'].update(designs=[design(side='back')],activeId=1),
    lambda d:d['studio'].update(designs=[design(dataURL='data:secret')]),
])
def test_invalid_studio_does_not_write(client,mutation):
    r=create(client).json(); d=deepcopy(r['document']); mutation(d)
    assert save(client,r['id'],d).status_code==422
    assert client.get(f"{PREFIX}/{r['id']}").json()==r


def test_studio_asset_ownership_copy_and_receipt(client):
    r=create(client).json(); p=r['id']; a=asset(client,p).json()['id']; d=r['document']
    d['studio']['designs']=[design(a)];d['studio']['activeId']=1
    foreign=create(client).json()
    assert save(client,foreign['id'],d).status_code==422
    assert save(client,p,d).status_code==200
    body=dict(request_id=uid(),name='Copy',document=d)
    response=client.post(f'{PREFIX}/{p}/copies',json=body)
    assert response.status_code==201
    copy=response.json(); mapped=copy['document']['studio']['designs'][0]['asset_id']
    assert mapped!=a
    assert client.get(f"{PREFIX}/{copy['id']}/assets/{mapped}").status_code==200
    assert client.post(f'{PREFIX}/{p}/copies',json=body).json()==copy
    assert client.get(f"{PREFIX}/{copy['id']}/assets/{a}").status_code==404


def test_legacy_v1_read_and_edit_unchanged(client,tmp_path):
    import json, sqlite3
    r=create(client).json();d=r['document'];d.pop('studio',None);d['schema_version']=1
    with sqlite3.connect(tmp_path/'designs.db') as db:
        db.execute('UPDATE versions SET document=? WHERE project_id=?',(json.dumps(d),r['id']))
    assert client.get(f"{PREFIX}/{r['id']}").json()['document']==d
    result=save(client,r['id'],d)
    assert result.status_code==200
    assert result.json()['document']==d


def test_studio_garment_switch_and_legacy_template_lock(client):
    r=create(client).json();d=r['document']
    d['template_id']='hoodie';d['studio']['settings']['garment']='hoodie'
    response=save(client,r['id'],d)
    assert response.status_code==200
    assert client.get(f"{PREFIX}/{r['id']}").json()['document']==d
    d.pop('studio');d['schema_version']=1;d['template_id']='tshirt'
    assert save(client,r['id'],d,version=2).status_code==422
