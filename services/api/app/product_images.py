"""Administrator-only, bounded raster assets; no publication or stock effects."""
import base64
import binascii
import hashlib
import json
from io import BytesIO
from typing import Literal
from uuid import UUID

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_BYTES = 2 * 1024 * 1024
MAX_BODY = 3 * 1024 * 1024
FORMATS = {'image/png': 'PNG', 'image/jpeg': 'JPEG', 'image/webp': 'WEBP'}
COLUMNS = 'id,product_id,kind,name,alt,data_url'


class ProductImageCreate(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, str_strip_whitespace=True)
    id: str
    kind: Literal['design', 'model', 'garment']
    name: str = Field(min_length=1, max_length=120)
    alt: str = Field(default='', max_length=240)
    data_url: str = Field(max_length=2_796_240)

    @field_validator('id')
    @classmethod
    def image_uuid(cls, value: str) -> str:
        try:
            return str(UUID(value))
        except ValueError:
            raise ValueError('A UUID upload identifier is required.') from None


def clean_raster(data_url: str) -> str:
    header, separator, encoded = data_url.partition(',')
    mime = header.removeprefix('data:').removesuffix(';base64')
    if not separator or header != f'data:{mime};base64' or mime not in FORMATS:
        raise HTTPException(422, 'Only base64 PNG, JPEG and WebP images are supported.')
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise HTTPException(422, 'Invalid image encoding.') from None
    if not raw or len(raw) > MAX_BYTES:
        raise HTTPException(422, 'An image must be between 1 byte and 2 MiB.')
    try:
        with Image.open(BytesIO(raw)) as probe:
            if probe.format != FORMATS[mime] or getattr(probe, 'n_frames', 1) != 1:
                raise HTTPException(422, 'Image type mismatch or animation is unsupported.')
            width, height = probe.size
            if max(width, height) > 4096 or width * height > 16_000_000:
                raise HTTPException(422, 'Image dimensions exceed 4096 pixels or 16 megapixels.')
            probe.verify()
        with Image.open(BytesIO(raw)) as source:
            oriented = ImageOps.exif_transpose(source)
            # Create a new pixel-only image so EXIF, comments and other metadata cannot survive.
            pixels = oriented.convert('RGB' if mime == 'image/jpeg' else 'RGBA')
            clean = Image.new(pixels.mode, pixels.size)
            clean.paste(pixels)
            output = BytesIO()
            clean.save(output, format=FORMATS[mime])
        if output.tell() > MAX_BYTES:
            raise HTTPException(422, 'Processed image exceeds 2 MiB; resize it before uploading.')
        return f'data:{mime};base64,' + base64.b64encode(output.getvalue()).decode('ascii')
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, KeyError, Image.DecompressionBombError):
        raise HTTPException(422, 'The raster image is corrupt or unsupported.') from None


class ProductImageStore:
    def __init__(self, catalog):
        self.catalog = catalog

    @staticmethod
    def require_product(db, product_id):
        if db.execute('SELECT 1 FROM products WHERE id=?', (product_id,)).fetchone() is None:
            raise HTTPException(404, 'Product not found.')

    def get(self, product_id: str) -> dict:
        with self.catalog.transaction() as db:
            self.require_product(db, product_id)
            return {'images': [dict(row) for row in db.execute(f'SELECT {COLUMNS} FROM product_images WHERE product_id=? ORDER BY rowid', (product_id,))]}

    def create(self, product_id: str, body: ProductImageCreate) -> dict:
        fingerprint = hashlib.sha256(json.dumps(body.model_dump(), sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        with self.catalog.transaction() as db:
            self.require_product(db, product_id)
            existing = db.execute(f'SELECT {COLUMNS},request_hash FROM product_images WHERE id=?', (body.id,)).fetchone()
            if existing is not None:
                if existing['product_id'] != product_id or existing['request_hash'] != fingerprint:
                    raise HTTPException(409, 'Upload identifier was already used for another image request.')
                return {key: existing[key] for key in COLUMNS.split(',')}
            if db.execute('SELECT COUNT(*) FROM product_images WHERE product_id=? AND kind=?', (product_id, body.kind)).fetchone()[0] >= 10:
                raise HTTPException(409, 'Each image category can contain at most 10 images.')
            row = {**body.model_dump(), 'product_id': product_id, 'data_url': clean_raster(body.data_url)}
            db.execute(f'INSERT INTO product_images({COLUMNS},request_hash) VALUES(:id,:product_id,:kind,:name,:alt,:data_url,:request_hash)', {**row, 'request_hash': fingerprint})
            return row

    def delete(self, product_id: str, image_id: str) -> dict:
        with self.catalog.transaction() as db:
            self.require_product(db, product_id)
            cursor = db.execute('DELETE FROM product_images WHERE product_id=? AND id=?', (product_id, image_id))
            if cursor.rowcount != 1:
                raise HTTPException(404, 'Product image not found.')
        return {'id': image_id}
