import base64
from copy import deepcopy
from io import BytesIO
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image

ADMIN = '/api/v1/admin/brand-about'
PUBLIC = '/api/v1/brand-about'
AUTH = {'Authorization': 'Bearer synthetic-brand-test'}


@pytest.fixture
def setup(tmp_path, monkeypatch):
    import app.config as config
    monkeypatch.setattr(config, 'load_admin_token', lambda _: 'synthetic-brand-test')
    monkeypatch.setattr(config, 'load_cors_origins', lambda _: [])
    import app.main as main
    monkeypatch.setattr(main, 'load_admin_token', lambda _: 'synthetic-brand-test')
    monkeypatch.setattr(main, 'load_cors_origins', lambda _: [])
    def fresh():
        return TestClient(main.create_app(env_file=tmp_path / 'absent.env', catalog_path=tmp_path / 'catalog.sqlite3', storefront_path=tmp_path / 'store.json', design_path=tmp_path / 'design.sqlite3', customer_path=tmp_path / 'customer.sqlite3', brand_about_path=tmp_path / 'brand.sqlite3'))
    return fresh(), fresh, tmp_path


def upload_payload(fmt='PNG', size=(8, 8)):
    output = BytesIO()
    exif = Image.Exif()
    exif[270] = 'Synthetic private metadata'
    Image.new('RGB', size, 'blue').save(output, format=fmt, exif=exif)
    return {'filename': 'synthetic.' + fmt.lower(), 'content_base64': base64.b64encode(output.getvalue()).decode()}


def test_draft_publish_conflict_and_restart(setup):
    client, fresh, path = setup
    original = client.get(PUBLIC).json()
    state = client.get(ADMIN, headers=AUTH).json()
    assert state['revision'] == state['published_revision'] == 0
    assert original == {'revision': 0, 'content': state['published']}
    content = deepcopy(state['draft'])
    content['title'] = 'Private draft'
    saved = client.put(ADMIN, headers=AUTH, json={'revision': 0, 'content': content})
    assert saved.status_code == 200
    assert saved.json()['revision'] == 1
    assert client.get(PUBLIC).json() == original
    assert fresh().get(ADMIN, headers=AUTH).json() == saved.json()
    for method, url, body in [('put', ADMIN, {'revision': 0, 'content': content}), ('post', ADMIN + '/publish', {'revision': 0})]:
        assert getattr(client, method)(url, headers=AUTH, json=body).status_code == 409
    published = client.post(ADMIN + '/publish', headers=AUTH, json={'revision': 1}).json()
    assert published['revision'] == published['published_revision'] == 2
    assert fresh().get(PUBLIC).json() == {'revision': 2, 'content': content}
    assert not (path / 'catalog.sqlite3').exists()


@pytest.mark.parametrize('method,suffix', [('get', ''), ('put', ''), ('post', '/publish'), ('post', '/assets'), ('get', '/assets/' + str(uuid4()))])
def test_admin_auth(setup, method, suffix):
    assert getattr(setup[0], method)(ADMIN + suffix).status_code == 401


@pytest.mark.parametrize('patch', [{'title': ' '}, {'title': 'x' * 101}, {'intro': 'x' * 1501}, {'hero_image': 'https://example.com/a.png'}, {'hero_image': '/api/v1/brand-about/assets/' + str(uuid4())}, {'extra': True}])
def test_content_validation(setup, patch):
    client = setup[0]
    content = client.get(PUBLIC).json()['content']
    content.update(patch)
    assert client.put(ADMIN, headers=AUTH, json={'revision': 0, 'content': content}).status_code == 422
    assert client.get(ADMIN, headers=AUTH).json()['revision'] == 0


def test_duplicate_topics_and_strict_revisions(setup):
    client = setup[0]
    content = client.get(PUBLIC).json()['content']
    content['topics'] *= 2
    assert client.put(ADMIN, headers=AUTH, json={'revision': 0, 'content': content}).status_code == 422
    for revision in [-1, True, '0', 0.1]:
        assert client.post(ADMIN + '/publish', headers=AUTH, json={'revision': revision}).status_code == 422
    assert client.post(ADMIN + '/publish', headers=AUTH, json={'revision': 0, 'extra': 1}).status_code == 422


@pytest.mark.parametrize('fmt', ['PNG', 'JPEG', 'WEBP'])
def test_assets_private_until_published_and_removed_reference(setup, fmt):
    client, fresh, _ = setup
    response = client.post(ADMIN + '/assets', headers=AUTH, json=upload_payload(fmt))
    assert response.status_code == 201
    image = response.json()['image']
    preview = image.replace('/brand-about/', '/admin/brand-about/')
    assert client.get(image).status_code == 404
    assert client.get(preview).status_code == 401
    asset = fresh().get(preview, headers=AUTH)
    assert asset.status_code == 200
    with Image.open(BytesIO(asset.content)) as decoded:
        assert not decoded.getexif()
    content = client.get(PUBLIC).json()['content']
    original = deepcopy(content)
    content['hero_image'] = image
    assert client.put(ADMIN, headers=AUTH, json={'revision': 0, 'content': content}).status_code == 200
    assert client.get(image).status_code == 404
    client.post(ADMIN + '/publish', headers=AUTH, json={'revision': 1})
    assert client.get(image).status_code == 200
    assert client.get(image).headers['cache-control'] == 'no-store'
    client.put(ADMIN, headers=AUTH, json={'revision': 2, 'content': original})
    assert client.get(image).status_code == 200
    client.post(ADMIN + '/publish', headers=AUTH, json={'revision': 3})
    assert client.get(image).status_code == 404


def test_upload_limits_and_unsupported_data(setup):
    client = setup[0]
    url = ADMIN + '/assets'
    assert client.post(url, headers=AUTH, content=b' ' * (3 * 1024 * 1024 + 1)).status_code == 413
    for raw in [b'<svg/>', b'<html/>', b'x' * (2 * 1024 * 1024 + 1)]:
        assert client.post(url, headers=AUTH, json={'filename': 'fake.png', 'content_base64': base64.b64encode(raw).decode()}).status_code == 422
    for payload in [upload_payload(size=(4097, 1)), {'filename': 'a.png', 'content_base64': '!!!'}, {**upload_payload(), 'extra': True}, upload_payload('GIF')]:
        assert client.post(url, headers=AUTH, json=payload).status_code == 422


def test_topic_and_text_boundaries(setup):
    client = setup[0]
    content = client.get(PUBLIC).json()['content']
    topic = content['topics'][0]
    content.update(eyebrow='e' * 60, title='t' * 100, intro='i' * 1500, hero_alt='a' * 200)
    content['topics'] = [{**topic, 'id': str(i), 'title': 't' * 80, 'description': 'd' * 800, 'alt': 'a' * 200} for i in range(6)]
    assert client.put(ADMIN, headers=AUTH, json={'revision': 0, 'content': content}).status_code == 200
    content['topics'].append({**topic, 'id': 'seventh'})
    assert client.put(ADMIN, headers=AUTH, json={'revision': 1, 'content': content}).status_code == 422
    for patch in [{'id': 'bad/id'}, {'id': 'x' * 65}, {'description': ' '}, {'alt': ' '}, {'image': '/images/unapproved.png'}]:
        content['topics'] = [{**topic, **patch}]
        assert client.put(ADMIN, headers=AUTH, json={'revision': 1, 'content': content}).status_code == 422
    content['topics'] = []
    assert client.put(ADMIN, headers=AUTH, json={'revision': 1, 'content': content}).status_code == 200


def test_atomic_revision_race(setup):
    from concurrent.futures import ThreadPoolExecutor
    client = setup[0]
    content = client.get(PUBLIC).json()['content']
    def save(title):
        return client.put(ADMIN, headers=AUTH, json={'revision': 0, 'content': {**content, 'title': title}}).status_code
    with ThreadPoolExecutor(max_workers=2) as workers:
        assert sorted(workers.map(save, ['first', 'second'])) == [200, 409]
    assert client.get(ADMIN, headers=AUTH).json()['revision'] == 1


def test_storage_failure_is_503(setup):
    client, _, path = setup
    (path / 'brand.sqlite3').mkdir()
    assert client.get(ADMIN, headers=AUTH).status_code == 503
    assert client.get(PUBLIC).status_code == 503
    assert client.post(ADMIN + '/assets', headers=AUTH, json=upload_payload()).status_code == 503


def test_stream_upload_bound_without_length(setup):
    client = setup[0]
    def chunks():
        for _ in range(4):
            yield b' ' * (1024 * 1024)
    assert client.post(ADMIN + '/assets', headers=AUTH, content=chunks()).status_code == 413


def test_philosophy_validation_and_draft_isolation(setup):
    client, fresh, _ = setup
    before = client.get(PUBLIC).json()
    state = client.get(ADMIN, headers=AUTH).json()
    content = deepcopy(state['draft'])
    content.update(philosophy_title='Synthetic title', philosophy_body='Synthetic body')
    for bad in [{'philosophy_body': ''}, {'philosophy_title': 'x' * 101}, {'philosophy_body': 'x' * 2001}]:
        assert client.put(ADMIN, headers=AUTH, json={'revision': 0, 'content': {**content, **bad}}).status_code == 422
    saved = client.put(ADMIN, headers=AUTH, json={'revision': 0, 'content': content})
    assert saved.status_code == 200
    assert client.get(PUBLIC).json() == before
    assert fresh().get(ADMIN, headers=AUTH).json()['draft']['philosophy_body'] == 'Synthetic body'
    assert client.post(ADMIN + '/publish', headers=AUTH, json={'revision': 1}).status_code == 200
    assert client.get(PUBLIC).json()['content']['philosophy_body'] == 'Synthetic body'
    del content['philosophy_title']
    del content['philosophy_body']
    legacy = client.put(ADMIN, headers=AUTH, json={'revision': 2, 'content': content})
    assert legacy.status_code == 200
    assert legacy.json()['draft']['philosophy_title'] == ''
