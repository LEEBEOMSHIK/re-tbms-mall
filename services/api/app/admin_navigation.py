"""Administrator navigation presentation settings; never an access-control policy."""
from contextlib import contextmanager
from copy import deepcopy
import json
from pathlib import Path
import re
import sqlite3
from typing import ClassVar, Literal

from fastapi import Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from starlette.concurrency import run_in_threadpool

DEFAULT_PATH = Path(__file__).resolve().parents[3] / '.local' / 'admin-navigation.sqlite3'
MAX_BODY = 32 * 1024
MENU_IDS = {'home', 'catalog', 'inventory', 'factories', 'designs', 'site', 'reviews', 'workboard', 'payment-preparation', 'orders'}
MenuId = Literal['home', 'catalog', 'inventory', 'factories', 'designs', 'site', 'reviews', 'workboard', 'payment-preparation', 'orders']
DEFAULT_GROUPS = [
    {'id': group_id, 'label': label, 'visible': True,
     'items': [{'id': item, 'visible': True} for item in items]}
    for group_id, label, items in [
        ('operations', '운영', ['home', 'catalog', 'inventory', 'orders']),
        ('production', '제작·협업', ['factories', 'designs']),
        ('site-customer', '사이트·고객', ['site', 'reviews']),
        ('project', '프로젝트', ['workboard', 'payment-preparation']),
    ]
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, str_strip_whitespace=True)


class MenuItem(StrictModel):
    id: MenuId
    visible: bool


class MenuGroup(StrictModel):
    id: str = Field(min_length=1, max_length=64, pattern=r'^[a-zA-Z0-9_-]+$')
    label: str = Field(min_length=1, max_length=40)
    visible: bool
    items: list[MenuItem] = Field(max_length=10)

    @field_validator('id', mode='before')
    @classmethod
    def exact_identifier(cls, value):
        # Labels are trimmed; stable identifiers must not be silently rewritten.
        if not isinstance(value, str) or re.fullmatch(r'[a-zA-Z0-9_-]{1,64}', value) is None:
            raise ValueError('Invalid group identifier.')
        return value


class NavigationState(StrictModel):
    registered_menu_ids: ClassVar[set[str]] = MENU_IDS
    revision: int = Field(ge=0, le=9_007_199_254_740_990)
    groups: list[MenuGroup] = Field(min_length=1, max_length=8)

    @field_validator('groups')
    @classmethod
    def validate_membership(cls, groups):
        if len({group.id for group in groups}) != len(groups):
            raise ValueError('Group identifiers must be unique.')
        menu_ids = [item.id for group in groups for item in group.items]
        if len(menu_ids) != len(cls.registered_menu_ids) or set(menu_ids) != cls.registered_menu_ids:
            raise ValueError('Each registered menu must appear exactly once.')
        return groups


class PreviousNavigationState(NavigationState):
    registered_menu_ids: ClassVar[set[str]] = MENU_IDS - {'orders'}


class LegacyNavigationState(NavigationState):
    registered_menu_ids: ClassVar[set[str]] = MENU_IDS - {'payment-preparation', 'orders'}


def failure(status, detail):
    return HTTPException(status, detail, headers={'Cache-Control': 'no-store'})


class AdminNavigationStore:
    def __init__(self, path: Path):
        self.path = path

    def initial(self):
        return {'revision': 0, 'groups': deepcopy(DEFAULT_GROUPS)}

    @contextmanager
    def transaction(self):
        db = None
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            db = sqlite3.connect(self.path, timeout=5)
            db.execute('BEGIN IMMEDIATE')
            db.execute('CREATE TABLE IF NOT EXISTS admin_navigation (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL)')
            yield db
            db.commit()
        except (OSError, sqlite3.Error, ValidationError, json.JSONDecodeError):
            raise failure(503, 'Navigation settings storage is temporarily unavailable.') from None
        finally:
            if db is not None:
                db.close()

    def state(self, db):
        row = db.execute('SELECT state FROM admin_navigation WHERE id=1').fetchone()
        if not row:
            return self.initial()
        try:
            return NavigationState.model_validate_json(row[0]).model_dump()
        except ValidationError:
            # Only the complete old registry is eligible; corrupt states still fail closed.
            try:
                legacy = PreviousNavigationState.model_validate_json(row[0]).model_dump()
            except ValidationError:
                legacy = LegacyNavigationState.model_validate_json(row[0]).model_dump()
                project = next(group for group in legacy['groups']
                               if any(item['id'] == 'workboard' for item in group['items']))
                project['items'].append({'id': 'payment-preparation', 'visible': True})
            operations = next(group for group in legacy['groups']
                              if any(item['id'] == 'inventory' for item in group['items']))
            operations['items'].append({'id': 'orders', 'visible': True})
            # Preserve revision and all existing presentation choices; persist only on save.
            return NavigationState.model_validate(legacy).model_dump()

    def get(self):
        if not self.path.exists():
            return self.initial()
        with self.transaction() as db:
            return self.state(db)

    def save(self, update: NavigationState):
        with self.transaction() as db:
            current = self.state(db)
            if update.revision != current['revision']:
                raise failure(409, 'Navigation settings changed. Read the latest version before saving.')
            result = update.model_dump()
            result['revision'] += 1
            # Reject the unreachable exhausted version rather than persisting an unreadable state.
            if result['revision'] > 9_007_199_254_740_990:
                raise failure(409, 'Navigation version is exhausted.')
            db.execute('INSERT INTO admin_navigation(id,state) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state', (json.dumps(result, ensure_ascii=False),))
            return result


def register_admin_navigation_routes(application, require_admin, path: Path):
    store = AdminNavigationStore(path)
    auth = [Depends(require_admin)]

    @application.get('/api/v1/admin/navigation', dependencies=auth)
    def get_navigation(response: Response):
        response.headers['Cache-Control'] = 'no-store'
        return store.get()

    @application.put('/api/v1/admin/navigation', dependencies=auth)
    async def save_navigation(request: Request, response: Response):
        raw = bytearray()
        async for chunk in request.stream():
            if len(raw) + len(chunk) > MAX_BODY:
                raise failure(413, 'Navigation settings body exceeds 32 KiB.')
            raw.extend(chunk)
        try:
            update = NavigationState.model_validate_json(raw)
        except ValidationError:
            raise failure(422, 'Check groups, menu membership, visibility and version.') from None
        response.headers['Cache-Control'] = 'no-store'
        return await run_in_threadpool(store.save, update)
