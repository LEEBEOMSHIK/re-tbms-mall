from io import BytesIO
import base64
import pytest
from PIL import Image
from fastapi import HTTPException
from app.brand_library import LibraryStore, LibraryContent, LibraryUpdate
from test_movement_reasons import setup
from test_factory import factory_setup, AUTH
from pydantic import ValidationError

def png():
    b=BytesIO(); Image.new('RGBA',(32,24),(255,0,0,128)).save(b,format='PNG'); return b.getvalue()

def test_draft_publish_and_latest_asset_access(tmp_path):
    store=LibraryStore(tmp_path/'library.sqlite3')
    original=store.get(True)
    asset=store.upload('sample.png',base64.b64encode(png()).decode())
    with pytest.raises(HTTPException) as e: store.asset(asset['id'],True)
    assert e.value.status_code==404
    content=LibraryContent(assets=[{'asset_id':asset['id'],'title':'Synthetic logo','usage':'Test only'}],notes='Synthetic revision')
    store.save(LibraryUpdate(revision=0,content=content))
    assert store.get(True)==original
    with pytest.raises(HTTPException) as e: store.publish(0)
    assert e.value.status_code==409
    result=store.publish(1)
    assert result['published_version']==2
    assert store.asset(asset['id'],True).body==png()
    assert LibraryStore(store.path).get(True)==store.get(True)
    store.save(LibraryUpdate(revision=2,content=LibraryContent(assets=[{'asset_id':'logo_long','title':'Original','usage':'Reference'}],notes='Restore')))
    store.publish(3)
    with pytest.raises(HTTPException): store.asset(asset['id'],True)
    assert store.asset(asset['id'],False).body==png()

def test_reject_bad_files_and_unknown_reference(tmp_path):
    store=LibraryStore(tmp_path/'library.sqlite3')
    for name,data in [('x.svg',b'<svg/>'),('x.png',b'bad'),('x.png',b'x'*(2*1024*1024+1))]:
        with pytest.raises(HTTPException): store.upload(name,base64.b64encode(data).decode())
    with pytest.raises(HTTPException): store.upload('../x.png',base64.b64encode(png()).decode())
    with pytest.raises(HTTPException): store.save(LibraryUpdate(revision=0,content=LibraryContent(assets=[{'asset_id':'unknown','title':'X','usage':'X'}],notes='X')))
    assert store.get()['revision']==0

def test_api_roles_revocation_and_private_draft(factory_setup):
    _,_,client,_,_,accounts,tokens=factory_setup
    admin='/api/v1/admin/brand-library'; factory='/api/v1/factory/brand-library'
    for path in (admin,factory,admin+'/assets/logo_long',factory+'/assets/logo_long'):
        assert client.get(path).status_code==401
    assert client.get(admin,headers=tokens[0]).status_code==401
    assert client.get(factory,headers=AUTH).status_code==401
    initial=client.get(factory,headers=tokens[0])
    assert initial.status_code==200 and 'draft' not in initial.json()
    asset=client.post(admin+'/assets',headers=AUTH,json={'filename':'test.png','content_base64':base64.b64encode(png()).decode()}).json()
    assert client.get(factory+'/assets/'+asset['id'],headers=tokens[0]).status_code==404
    body={'revision':0,'content':{'assets':[{'asset_id':asset['id'],'title':'Synthetic','usage':'Reference'}],'notes':'Test only'}}
    assert client.put(admin,headers=tokens[0],json=body).status_code==401
    assert client.put(admin,headers=AUTH,json=body).status_code==200
    assert client.get(factory,headers=tokens[0]).json()==initial.json()
    assert client.post(admin+'/publish',headers=AUTH,json={'revision':1}).status_code==200
    response=client.get(factory+'/assets/'+asset['id']+'?download=true',headers=tokens[0])
    assert response.content==png() and response.headers['cache-control']=='no-store'
    assert response.headers['content-disposition'].startswith('attachment')
    assert client.get(factory+'/assets/logo_long',headers=tokens[0]).status_code==404
    assert client.put('/api/v1/admin/factory-accounts/'+accounts[0]['id'],headers=AUTH,json={'display_name':'Factory','is_active':False,'version':0}).status_code==200
    assert client.get(factory,headers=tokens[0]).status_code==401
    assert client.get(factory+'/assets/'+asset['id'],headers=tokens[0]).status_code==401

def test_content_limits_and_concurrent_revision(tmp_path):
    from concurrent.futures import ThreadPoolExecutor
    store=LibraryStore(tmp_path/'library.sqlite3')
    item={'asset_id':'logo_long','title':'A','usage':'Reference'}
    for assets in ([],[item,item],[item]*13):
        with pytest.raises(ValidationError): LibraryContent(assets=assets,notes='Test')
    with pytest.raises(ValidationError): LibraryContent(assets=[{**item,'title':' '}],notes='Test')
    with pytest.raises(HTTPException): store.publish(0)
    body=LibraryUpdate(revision=0,content=LibraryContent(assets=[item],notes='Concurrent'))
    def save():
        try: store.save(body); return 200
        except HTTPException as e: return e.status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(lambda _:save(),range(2)))==[200,409]
