"""Versioned brand content and publication-scoped, sanitized raster assets."""
import base64
import binascii
from contextlib import contextmanager
from io import BytesIO
import json
from pathlib import Path
import re
import sqlite3
from uuid import UUID, uuid4

from fastapi import Depends, HTTPException, Request, Response
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator, field_validator
from starlette.concurrency import run_in_threadpool

from app.product_images import MAX_BODY, MAX_BYTES, clean_raster

DEFAULT_PATH = Path(__file__).resolve().parents[3] / '.local' / 'brand-about.sqlite3'
ASSET_PREFIX = '/api/v1/brand-about/assets/'
PRESETS = {'/images/brand/individuality-hero.png', '/images/brand/ai-language.png', '/images/brand/hidden-patterns.png', '/images/brand/human-ai.png'}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, str_strip_whitespace=True)


def image_reference(value: str) -> str:
    if value in PRESETS:
        return value
    if value.startswith(ASSET_PREFIX):
        try:
            asset_id = value.removeprefix(ASSET_PREFIX)
            if str(UUID(asset_id)) == asset_id:
                return value
        except ValueError:
            pass
    raise ValueError('Choose a preset or an uploaded brand image.')


class Topic(StrictModel):
    id: str = Field(min_length=1, max_length=64, pattern=r'^[a-zA-Z0-9_-]+$')
    title: str = Field(min_length=1, max_length=80)
    description: str = Field(min_length=1, max_length=800)
    image: str = Field(max_length=200)
    alt: str = Field(min_length=1, max_length=200)
    _image = field_validator('image')(image_reference)


class Content(StrictModel):
    eyebrow: str = Field(min_length=1, max_length=60)
    title: str = Field(min_length=1, max_length=100)
    intro: str = Field(min_length=1, max_length=1500)
    philosophy_title: str = Field(default="", max_length=100)
    philosophy_body: str = Field(default="", max_length=2000)
    hero_image: str = Field(max_length=200)
    hero_alt: str = Field(min_length=1, max_length=200)
    topics: list[Topic] = Field(max_length=6)
    _image = field_validator('hero_image')(image_reference)

    @model_validator(mode='after')
    def complete_philosophy(self):
        if bool(self.philosophy_title) != bool(self.philosophy_body):
            raise ValueError('Philosophy title and body must be provided together.')
        return self

    @field_validator('topics')
    @classmethod
    def distinct_ids(cls, value):
        if len({topic.id for topic in value}) != len(value):
            raise ValueError('Topic IDs must be unique.')
        return value


class Revision(StrictModel):
    revision: int = Field(ge=0)


class Update(Revision):
    content: Content


class Upload(StrictModel):
    filename: str = Field(min_length=1, max_length=240)
    content_base64: str = Field(min_length=1, max_length=2_796_208)


def references(content):
    return {content['hero_image'], *(topic['image'] for topic in content['topics'])}


class BrandAboutStore:
    def __init__(self, path: Path):
        self.path = path
        self.seed = Content.model_validate_json((Path(__file__).parent / 'data' / 'brand-about-default.json').read_text(encoding='utf-8-sig')).model_dump()

    def initial(self):
        return {'revision': 0, 'draft': self.seed, 'published': self.seed, 'published_revision': 0}

    @contextmanager
    def transaction(self):
        db = None
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            db = sqlite3.connect(self.path, timeout=5)
            db.execute('BEGIN IMMEDIATE')
            db.execute('CREATE TABLE IF NOT EXISTS brand_state (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS brand_assets (id TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL)')
            yield db
            db.commit()
        except (OSError, sqlite3.Error):
            raise HTTPException(503, 'Brand content storage is temporarily unavailable.') from None
        finally:
            if db is not None:
                db.close()

    def state(self, db):
        row = db.execute('SELECT state FROM brand_state WHERE id=1').fetchone()
        return json.loads(row[0]) if row else self.initial()

    def get(self, public=False):
        if not self.path.exists():
            result = self.initial()
        else:
            with self.transaction() as db:
                result = self.state(db)
        return {'revision': result['published_revision'], 'content': result['published']} if public else result

    def mutate(self, body: Revision, publish=False):
        with self.transaction() as db:
            state = self.state(db)
            if body.revision != state['revision']:
                raise HTTPException(409, 'Brand content changed. Reload before saving or publishing.')
            if not publish:
                content = body.content.model_dump()
                for image in references(content):
                    if image.startswith(ASSET_PREFIX) and db.execute('SELECT 1 FROM brand_assets WHERE id=?', (image.removeprefix(ASSET_PREFIX),)).fetchone() is None:
                        raise HTTPException(422, 'An uploaded image reference does not exist.')
                state['draft'] = content
            state['revision'] += 1
            if publish:
                state['published'] = state['draft']
                state['published_revision'] = state['revision']
            db.execute('INSERT INTO brand_state(id,state) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state', (json.dumps(state, ensure_ascii=False),))
            return state

    def upload(self, body: Upload):
        try:
            raw = base64.b64decode(body.content_base64, validate=True)
        except (ValueError, binascii.Error):
            raise HTTPException(422, 'Invalid image encoding.') from None
        if not raw or len(raw) > MAX_BYTES:
            raise HTTPException(422, 'An image must be between 1 byte and 2 MiB.')
        try:
            with Image.open(BytesIO(raw)) as probe:
                mime = {'PNG': 'image/png', 'JPEG': 'image/jpeg', 'WEBP': 'image/webp'}.get(probe.format)
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            raise HTTPException(422, 'The raster image is corrupt or unsupported.') from None
        if mime is None:
            raise HTTPException(422, 'Only PNG, JPEG and WebP images are supported.')
        clean = clean_raster(f'data:{mime};base64,' + body.content_base64)
        asset_id = str(uuid4())
        with self.transaction() as db:
            db.execute('INSERT INTO brand_assets(id,mime,data) VALUES(?,?,?)', (asset_id, mime, base64.b64decode(clean.partition(',')[2])))
        return {'image': ASSET_PREFIX + asset_id}

    def asset(self, asset_id: str, public=False):
        if not re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', asset_id) or not self.path.exists():
            raise HTTPException(404, 'Brand image not found.')
        with self.transaction() as db:
            if public and ASSET_PREFIX + asset_id not in references(self.state(db)['published']):
                raise HTTPException(404, 'Brand image not found.')
            row = db.execute('SELECT mime,data FROM brand_assets WHERE id=?', (asset_id,)).fetchone()
            if row is None:
                raise HTTPException(404, 'Brand image not found.')
            return Response(row[1], media_type=row[0], headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


def register_brand_about_routes(application, require_admin, path: Path):
    store = BrandAboutStore(path)
    admin = '/api/v1/admin/brand-about'
    public = '/api/v1/brand-about'
    auth = [Depends(require_admin)]

    @application.get(public)
    def public_content(response: Response):
        response.headers['Cache-Control'] = 'no-store'
        return store.get(public=True)

    @application.get(admin, dependencies=auth)
    def admin_content(response: Response):
        response.headers['Cache-Control'] = 'no-store'
        return store.get()

    @application.put(admin, dependencies=auth)
    def save(body: Update):
        return store.mutate(body)

    @application.post(admin + '/publish', dependencies=auth)
    def publish(body: Revision):
        return store.mutate(body, publish=True)

    @application.post(admin + '/assets', dependencies=auth, status_code=201)
    async def upload(request: Request):
        raw = bytearray()
        async for chunk in request.stream():
            if len(raw) + len(chunk) > MAX_BODY:
                raise HTTPException(413, 'Image upload body exceeds 3 MiB.')
            raw.extend(chunk)
        try:
            body = Upload.model_validate_json(raw)
        except ValidationError:
            raise HTTPException(422, 'Check filename and image data.') from None
        return await run_in_threadpool(store.upload, body)

    @application.get(admin + '/assets/{asset_id}', dependencies=auth)
    def preview_image(asset_id: str):
        return store.asset(asset_id)

    @application.get(public + '/assets/{asset_id}')
    def public_image(asset_id: str):
        return store.asset(asset_id, public=True)
