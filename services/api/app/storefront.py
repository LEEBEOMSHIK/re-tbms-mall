"""Validated local demo merchandising, safe for a single server process only."""

import json
import os
import tempfile
from pathlib import Path
from threading import Lock
from typing import Annotated, Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictBool, ValidationError, field_validator

from app.catalogue import CATEGORIES, DEFAULT_SECTIONS, PRODUCTS, PRODUCT_IDS

MAX_FILE_BYTES = 131072
DEFAULT_PATH = Path(__file__).resolve().parents[3] / '.local' / 'storefront.json'
# Shared across store instances in this process. Multi-worker use requires a database.
_STORE_LOCK = Lock()


class Section(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    id: str = Field(min_length=1, max_length=64, pattern=r'^[a-zA-Z0-9][a-zA-Z0-9_-]*$')
    title: str = Field(min_length=1, max_length=80)
    subtitle: str = Field(max_length=200)
    kind: Literal['category', 'collection']
    product_ids: list[str] = Field(max_length=12)
    enabled: StrictBool

    @field_validator('title')
    @classmethod
    def nonblank_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('title must not be blank')
        return value

    @field_validator('product_ids')
    @classmethod
    def valid_products(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value):
            raise ValueError('product_ids must be unique within a section')
        if any(not isinstance(product_id,str) or not product_id or len(product_id)>80 for product_id in value):
            raise ValueError('invalid product id')
        return value


class StorefrontUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    revision: Annotated[int, Field(ge=0)]
    sections: list[Section] = Field(max_length=20)

    @field_validator('sections')
    @classmethod
    def unique_sections(cls, value: list[Section]) -> list[Section]:
        if len({section.id for section in value}) != len(value):
            raise ValueError('section ids must be unique')
        return value


class StorefrontStore:
    def __init__(self, path: Path = DEFAULT_PATH):
        self.path = path
        self.public_catalog = None

    def _read(self) -> StorefrontUpdate:
        try:
            with self.path.open('rb') as source:
                raw = source.read(MAX_FILE_BYTES + 1)
            if len(raw) > MAX_FILE_BYTES:
                raise ValueError('file too large')
            return StorefrontUpdate.model_validate(json.loads(raw))
        except FileNotFoundError:
            return StorefrontUpdate(revision=0, sections=DEFAULT_SECTIONS)
        except (OSError, ValueError, ValidationError) as exc:
            raise HTTPException(503, 'Storefront settings cannot be read. Restore the local settings file before retrying.') from exc

    def response(self, state: StorefrontUpdate, public: bool = False) -> dict:
        catalog = self.public_catalog.listing(public=public) if self.public_catalog else {'categories':CATEGORIES,'products':PRODUCTS}
        ids = {p['id'] for p in catalog['products']}
        sections = [{**section.model_dump(), 'product_ids':[id for id in section.product_ids if id in ids]} for section in state.sections if section.enabled or not public]
        if public: sections = [section for section in sections if section['product_ids']]
        return {'revision':state.revision, **catalog, 'sections':sections}

    def get(self, *, public: bool = False) -> dict:
        with _STORE_LOCK:
            return self.response(self._read(), public)

    def update(self, body: StorefrontUpdate) -> dict:
        with _STORE_LOCK:
            current = self._read()
            if current.revision != body.revision:
                raise HTTPException(409, 'Settings changed. Reload before saving again.')
            ids = {p['id'] for p in (self.public_catalog.listing(public=False)['products'] if self.public_catalog else PRODUCTS)}
            if any(id not in ids for section in body.sections for id in section.product_ids):
                raise HTTPException(422, 'Choose existing products.')
            updated = body.model_copy(update={'revision': current.revision + 1})
            raw = updated.model_dump_json().encode('utf-8')
            if len(raw) > MAX_FILE_BYTES:
                raise HTTPException(422, 'Settings exceed the local size limit.')
            temporary = None
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with tempfile.NamedTemporaryFile(mode='wb', dir=self.path.parent, prefix='.storefront-', suffix='.tmp', delete=False) as target:
                    temporary = Path(target.name)
                    target.write(raw)
                    target.flush()
                    os.fsync(target.fileno())
                os.replace(temporary, self.path)
            except OSError as exc:
                raise HTTPException(503, 'Storefront settings could not be saved. Retry after checking local storage.') from exc
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
            return self.response(updated)
