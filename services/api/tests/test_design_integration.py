from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import create_app

def test_design_router_separate_db_auth_and_catalog_unchanged(tmp_path):
    env=tmp_path/'test.env'
    env.write_text('STORE_ADMIN_TOKEN=synthetic-test-only')
    app=create_app(env_file=env,storefront_path=tmp_path/'store.json',catalog_path=tmp_path/'catalog.db',design_path=tmp_path/'design.db')
    with TestClient(app) as client:
        assert client.get('/api/v1/admin/designs').status_code==401
        headers={'Authorization':'Bearer synthetic-test-only'}
        assert client.get('/api/v1/admin/catalog',headers=headers).status_code==200
        before=(tmp_path/'catalog.db').read_bytes()
        r=client.post('/api/v1/admin/designs',headers=headers,json={'request_id':str(uuid4()),'name':'Synthetic tee','template_id':'tshirt','template_version':1})
        assert r.status_code==201
        assert (tmp_path/'design.db').exists()
        assert (tmp_path/'catalog.db').read_bytes()==before
        assert client.get('/api/v1/admin/designs/'+r.json()['id'],headers=headers).json()['document']['template_id']=='tshirt'
