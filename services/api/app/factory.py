"""Supplier-scoped factory access and production requests, independent of stock."""
from datetime import date, datetime, timezone
import hashlib
import hmac
import json
import math
import re
import secrets
import sqlite3
import time
from typing import Literal
from uuid import UUID, uuid4

from fastapi import Depends, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from starlette.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

PASSWORD_ITERATIONS = 600_000
SESSION_SECONDS = 8 * 60 * 60
ACCOUNT_COLUMNS = 'id,supplier_id,username,display_name,is_active,version'
ACTIVE_REQUESTS = ('submitted', 'accepted', 'in_production')


def factory_path(path):
    return path.startswith(('/api/v1/factory/', '/api/v1/admin/factory-', '/api/v1/admin/production-requests', '/api/v1/admin/shipments')) or (path.startswith('/api/v1/admin/products/') and path.endswith(('/suppliers', '/progress')))


class FactoryBodyLimit:
    """Bound factory JSON before FastAPI parses it; no credentials in errors."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or not factory_path(scope['path']):
            return await self.app(scope, receive, send)
        original_send = send

        async def private_send(message):
            if message['type'] == 'http.response.start':
                headers = [(key, value) for key, value in message.get('headers', []) if key.lower() != b'cache-control']
                message = {**message, 'headers': headers + [(b'cache-control', b'no-store')]}
            await original_send(message)

        send = private_send
        if scope['method'] not in ('POST', 'PUT'):
            return await self.app(scope, receive, send)
        chunks = []
        size = 0
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            chunk = message.get('body', b'')
            size += len(chunk)
            if size > 65_536:
                return await JSONResponse({'detail': 'Request body exceeds 64 KiB.'}, status_code=413)(scope, receive, send)
            chunks.append(chunk)
            if not message.get('more_body'):
                break
        pending = True

        async def bounded_receive():
            nonlocal pending
            if pending:
                pending = False
                return {'type': 'http.request', 'body': b''.join(chunks), 'more_body': False}
            return await receive()
        await self.app(scope, bounded_receive, send)


def migrate_factory(db):
    db.execute('''CREATE TABLE factory_accounts (
        id TEXT PRIMARY KEY, supplier_id TEXT NOT NULL REFERENCES suppliers(id),
        username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL, is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),
        version INTEGER NOT NULL DEFAULT 0)''')
    db.execute('''CREATE TABLE factory_sessions (
        token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES factory_accounts(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL)''')
    db.execute('CREATE INDEX factory_sessions_account ON factory_sessions(account_id)')
    db.execute('''CREATE TABLE factory_login_limits (
        bucket TEXT PRIMARY KEY, failures INTEGER NOT NULL, started_at INTEGER NOT NULL)''')
    db.execute('''CREATE TABLE product_suppliers (
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        supplier_id TEXT NOT NULL REFERENCES suppliers(id), PRIMARY KEY(product_id,supplier_id), UNIQUE(product_id))''')
    db.execute('''CREATE TABLE production_requests (
        id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id),
        supplier_id TEXT NOT NULL REFERENCES suppliers(id), product_name TEXT NOT NULL,
        internal_name TEXT NOT NULL, supplier_name TEXT NOT NULL, lines TEXT NOT NULL,
        due_date TEXT NOT NULL, note TEXT NOT NULL, status TEXT NOT NULL
        CHECK(status IN ('submitted','accepted','in_production','ready','cancelled')),
        version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        request_hash TEXT NOT NULL)''')
    db.execute('CREATE INDEX production_requests_supplier ON production_requests(supplier_id,status)')
    db.execute('''CREATE TABLE factory_image_shares (
        product_id TEXT NOT NULL, supplier_id TEXT NOT NULL,
        image_id TEXT NOT NULL REFERENCES product_images(id) ON DELETE CASCADE,
        PRIMARY KEY(product_id,supplier_id,image_id),
        FOREIGN KEY(product_id,supplier_id) REFERENCES product_suppliers(product_id,supplier_id) ON DELETE CASCADE)''')
    db.execute('''CREATE TABLE production_history (
        id INTEGER PRIMARY KEY, request_id TEXT NOT NULL REFERENCES production_requests(id),
        from_status TEXT NOT NULL, to_status TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL)''')
    db.execute('PRAGMA user_version=10')


def migrate_factory_progress(db):
    db.execute("ALTER TABLE product_suppliers ADD COLUMN assignment_id TEXT NOT NULL DEFAULT ''")
    db.execute("ALTER TABLE product_suppliers ADD COLUMN progress_status TEXT NOT NULL DEFAULT 'not_started' CHECK(progress_status IN ('not_started','design_review','sample_in_progress','design_complete'))")
    db.execute("ALTER TABLE product_suppliers ADD COLUMN progress_updated_at TEXT NOT NULL DEFAULT ''")
    for row in db.execute('SELECT product_id,supplier_id FROM product_suppliers').fetchall():
        db.execute('UPDATE product_suppliers SET assignment_id=? WHERE product_id=? AND supplier_id=?', (str(uuid4()), row['product_id'], row['supplier_id']))
    db.execute('CREATE UNIQUE INDEX product_suppliers_generation ON product_suppliers(assignment_id)')
    # History survives assignment removal; a generation never reuses the old factory's history.
    db.execute('''CREATE TABLE product_progress_history (
        id INTEGER PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        supplier_id TEXT NOT NULL REFERENCES suppliers(id), supplier_name TEXT NOT NULL,
        assignment_id TEXT NOT NULL, status TEXT NOT NULL,
        note TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL)''')
    db.execute('CREATE INDEX product_progress_history_product ON product_progress_history(product_id,assignment_id)')
    db.execute('PRAGMA user_version=11')


class FactoryInput(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)


class AccountCreate(FactoryInput):
    supplier_id: str = Field(min_length=1, max_length=64)
    username: str = Field(pattern=r'^[A-Za-z0-9_.-]{3,64}$')
    display_name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=12, max_length=128)
    is_active: bool

    @field_validator('username')
    @classmethod
    def normalize_username(cls, value):
        return value.lower()

    @field_validator('display_name')
    @classmethod
    def nonblank_name(cls, value):
        if not value.strip():
            raise ValueError('Display name must not be blank.')
        return value.strip()

    @field_validator('password')
    @classmethod
    def nonblank_password(cls, value):
        if not value.strip():
            raise ValueError('Password must not be blank.')
        return value


class AccountUpdate(FactoryInput):
    display_name: str = Field(min_length=1, max_length=80)
    is_active: bool
    version: int = Field(ge=0, le=2_147_483_647)
    password: str | None = Field(default=None, min_length=12, max_length=128)

    @field_validator('display_name')
    @classmethod
    def nonblank_name(cls, value):
        return AccountCreate.nonblank_name(value)

    @field_validator('password')
    @classmethod
    def supplied_password_not_null(cls, value):
        if value is None:
            raise ValueError('Omit an unchanged password; null is not a reset.')
        if not value.strip():
            raise ValueError('Password must not be blank.')
        return value


class ProfileUpdate(FactoryInput):
    display_name: str = Field(min_length=1, max_length=80)
    version: int = Field(ge=0, le=2_147_483_647)
    current_password: str | None = Field(default=None, min_length=1, max_length=128)
    new_password: str | None = Field(default=None, min_length=12, max_length=128)

    @field_validator('display_name')
    @classmethod
    def nonblank_name(cls, value):
        return AccountCreate.nonblank_name(value)

    @model_validator(mode='after')
    def password_pair(self):
        supplied = self.model_fields_set & {'current_password', 'new_password'}
        if supplied and (len(supplied) != 2 or self.current_password is None or self.new_password is None):
            raise ValueError('Supply both passwords or omit both.')
        if self.new_password is not None and not self.new_password.strip():
            raise ValueError('Password must not be blank.')
        return self


class FactoryLogin(FactoryInput):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class SharedImages(FactoryInput):
    supplier_id: str = Field(min_length=1, max_length=64)
    image_ids: list[str] = Field(max_length=10)

    @field_validator('image_ids')
    @classmethod
    def distinct_images(cls, values):
        if len(set(values)) != len(values) or any(not v or len(v) > 64 for v in values):
            raise ValueError('Supply distinct valid image identifiers.')
        return values


class ProductSuppliers(FactoryInput):
    supplier_ids: list[str] = Field(max_length=1)
    shared_images: list[SharedImages] = Field(default_factory=list, max_length=1)
    version: int = Field(ge=0, le=2_147_483_647)

    @field_validator('supplier_ids')
    @classmethod
    def unique_ids(cls, values):
        if len(set(values)) != len(values) or any(not v or len(v) > 64 for v in values):
            raise ValueError('Supply distinct valid supplier identifiers.')
        return values


class ProductionLine(FactoryInput):
    sku_id: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=1, le=1_000_000)


class ProductionCreate(FactoryInput):
    id: str
    product_id: str = Field(min_length=1, max_length=64)
    supplier_id: str = Field(min_length=1, max_length=64)
    lines: list[ProductionLine] = Field(min_length=1, max_length=100)
    due_date: str = Field(default='', max_length=10)
    note: str = Field(default='', max_length=2000)

    @field_validator('id')
    @classmethod
    def request_uuid(cls, value):
        try:
            return str(UUID(value))
        except ValueError:
            raise ValueError('A UUID request identifier is required.') from None

    @field_validator('due_date')
    @classmethod
    def valid_date(cls, value):
        if value:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
                raise ValueError('Use YYYY-MM-DD.')
            date.fromisoformat(value)
        return value

    @field_validator('lines')
    @classmethod
    def unique_skus(cls, values):
        if len({line.sku_id for line in values}) != len(values):
            raise ValueError('Each SKU must appear once.')
        return values


class FactoryStatus(FactoryInput):
    status: Literal['accepted', 'in_production', 'ready']
    version: int = Field(ge=0, le=2_147_483_647)


class ProductProgressUpdate(FactoryInput):
    status: Literal['not_started', 'design_review', 'sample_in_progress', 'design_complete']
    version: int = Field(ge=0, le=2_147_483_647)
    note: str = Field(default='', max_length=1000)

    @field_validator('note')
    @classmethod
    def trim_note(cls, value):
        return value.strip()


class AdminStatus(FactoryInput):
    status: Literal['cancelled']
    version: int = Field(ge=0, le=2_147_483_647)


def password_hash(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PASSWORD_ITERATIONS)
    return f'{PASSWORD_ITERATIONS}:{salt.hex()}:{digest.hex()}'


def password_matches(password, encoded):
    try:
        rounds, salt, expected = encoded.split(':')
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(rounds))
        return hmac.compare_digest(actual.hex(), expected)
    except (ValueError, TypeError):
        return False


def account_response(row):
    return {**{key: row[key] for key in ACCOUNT_COLUMNS.split(',')}, 'is_active': bool(row['is_active'])}


def production_response(row):
    return {key: json.loads(row[key]) if key == 'lines' else row[key] for key in row.keys() if key != 'request_hash'}


def utc_now():
    return datetime.now(timezone.utc).isoformat()


class FactoryStore:
    def __init__(self, catalog):
        self.catalog = catalog

    @staticmethod
    def supplier(db, supplier_id, active=True):
        row = db.execute('SELECT id,name,is_active FROM suppliers WHERE id=?', (supplier_id,)).fetchone()
        if row is None:
            raise HTTPException(404, 'Supplier not found.')
        if active and not row['is_active']:
            raise HTTPException(409, 'Supplier is inactive.')
        return row

    @staticmethod
    def assigned(db, product_id, supplier_id):
        if db.execute('SELECT 1 FROM product_suppliers WHERE product_id=? AND supplier_id=?', (product_id, supplier_id)).fetchone() is None:
            raise HTTPException(404, 'Assigned product not found.')

    def admin_workspace(self):
        with self.catalog.transaction() as db:
            return {'assignments': [dict(row) for row in db.execute('SELECT product_id,supplier_id,progress_status FROM product_suppliers ORDER BY rowid')],
                    'shared_images': self.shares(db),
                    'accounts': [account_response(row) for row in db.execute(f'SELECT {ACCOUNT_COLUMNS} FROM factory_accounts ORDER BY rowid')],
                    'requests': [self.request_response(db, row) for row in db.execute('SELECT * FROM production_requests ORDER BY rowid DESC')]}

    @staticmethod
    def shares(db, product_id=None):
        grouped = {}
        for row in db.execute('SELECT product_id,supplier_id,image_id FROM factory_image_shares ORDER BY rowid'):
            if product_id is None or row['product_id'] == product_id:
                grouped.setdefault((row['product_id'], row['supplier_id']), []).append(row['image_id'])
        return [{'product_id': pid, 'supplier_id': sid, 'image_ids': ids} for (pid, sid), ids in grouped.items()]

    @staticmethod
    def request_response(db, row):
        return {**production_response(row), 'history': [dict(event) for event in db.execute('SELECT from_status,to_status,actor,created_at FROM production_history WHERE request_id=? ORDER BY id', (row['id'],))]}

    def assignments(self, product_id, body):
        with self.catalog.transaction() as db:
            product = db.execute('SELECT version FROM products WHERE id=?', (product_id,)).fetchone()
            if product is None:
                raise HTTPException(404, 'Product not found.')
            if product['version'] != body.version:
                raise HTTPException(409, 'Product assignment or details changed. Reload before saving.')
            for supplier_id in body.supplier_ids:
                self.supplier(db, supplier_id)
            for shared in body.shared_images:
                if shared.supplier_id not in body.supplier_ids:
                    raise HTTPException(422, 'Images can only be shared with the assigned supplier.')
                for image_id in shared.image_ids:
                    if db.execute("SELECT 1 FROM product_images WHERE id=? AND product_id=? AND kind='design'", (image_id, product_id)).fetchone() is None:
                        raise HTTPException(422, 'Only this product\'s design images can be shared.')
            existing = {row[0] for row in db.execute('SELECT supplier_id FROM product_suppliers WHERE product_id=?', (product_id,))}
            for supplier_id in existing - set(body.supplier_ids):
                if db.execute("SELECT 1 FROM production_requests WHERE product_id=? AND supplier_id=? AND status IN ('submitted','accepted','in_production')", (product_id, supplier_id)).fetchone():
                    raise HTTPException(409, 'Finish or cancel active production requests before removing an assignment.')
            for supplier_id in existing - set(body.supplier_ids):
                db.execute('DELETE FROM product_suppliers WHERE product_id=? AND supplier_id=?', (product_id, supplier_id))
            db.executemany('INSERT OR IGNORE INTO product_suppliers(product_id,supplier_id,assignment_id) VALUES(?,?,?)', [(product_id, sid, str(uuid4())) for sid in body.supplier_ids])
            if 'shared_images' in body.model_fields_set:
                db.execute('DELETE FROM factory_image_shares WHERE product_id=?', (product_id,))
                for shared in body.shared_images:
                    db.executemany('INSERT INTO factory_image_shares(product_id,supplier_id,image_id) VALUES(?,?,?)', [(product_id, shared.supplier_id, iid) for iid in shared.image_ids])
            db.execute('UPDATE products SET version=version+1 WHERE id=?', (product_id,))
            return {'product_id': product_id, 'supplier_ids': body.supplier_ids, 'shared_images': self.shares(db, product_id), 'version': body.version + 1}

    def create_account(self, body):
        hashed = password_hash(body.password)
        row = {'id': str(uuid4()), 'supplier_id': body.supplier_id, 'username': body.username,
               'display_name': body.display_name, 'is_active': body.is_active, 'version': 0}
        with self.catalog.transaction() as db:
            self.supplier(db, body.supplier_id)
            try:
                db.execute('INSERT INTO factory_accounts(id,supplier_id,username,display_name,is_active,version,password_hash) VALUES(:id,:supplier_id,:username,:display_name,:is_active,:version,:password_hash)', {**row, 'password_hash': hashed})
            except sqlite3.IntegrityError:
                raise HTTPException(409, 'Factory username already exists.') from None
        return row

    def update_account(self, account_id, body):
        hashed = password_hash(body.password) if body.password is not None else None
        with self.catalog.transaction() as db:
            current = db.execute('SELECT * FROM factory_accounts WHERE id=?', (account_id,)).fetchone()
            if current is None:
                raise HTTPException(404, 'Factory account not found.')
            if current['version'] != body.version:
                raise HTTPException(409, 'Factory account changed. Reload before saving.')
            db.execute('UPDATE factory_accounts SET display_name=?,is_active=?,version=version+1,password_hash=? WHERE id=?',
                       (body.display_name, body.is_active, hashed or current['password_hash'], account_id))
            if not body.is_active or hashed is not None:
                db.execute('DELETE FROM factory_sessions WHERE account_id=?', (account_id,))
            return account_response(db.execute('SELECT * FROM factory_accounts WHERE id=?', (account_id,)).fetchone())

    def login(self, body, client):
        now = int(time.time())
        username = body.username.lower()
        buckets = [(hashlib.sha256(('username:'+username).encode()).hexdigest(), 5),
                   (hashlib.sha256(('client:'+client).encode()).hexdigest(), 30)]
        invalid = False
        with self.catalog.transaction() as db:
            db.execute('DELETE FROM factory_login_limits WHERE started_at<=?', (now-900,))
            db.execute('DELETE FROM factory_sessions WHERE expires_at<=?', (now,))
            for bucket, limit in buckets:
                row = db.execute('SELECT failures FROM factory_login_limits WHERE bucket=?', (bucket,)).fetchone()
                if row and row['failures'] >= limit:
                    raise HTTPException(429, 'Too many login attempts. Try again later.', headers={'Retry-After': '900'})
            row = db.execute('SELECT a.*,s.name AS supplier_name,s.is_active AS supplier_active FROM factory_accounts a JOIN suppliers s ON s.id=a.supplier_id WHERE a.username=?', (username,)).fetchone()
            # Unknown usernames perform the same PBKDF2 work without storing a credential.
            encoded = row['password_hash'] if row else f'{PASSWORD_ITERATIONS}:' + '00'*16 + ':' + '00'*32
            matches = password_matches(body.password, encoded)
            if row is None or not matches or not row['is_active'] or not row['supplier_active']:
                for bucket, _ in buckets:
                    db.execute('INSERT INTO factory_login_limits(bucket,failures,started_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET failures=failures+1', (bucket, now))
                invalid = True
            else:
                token = secrets.token_urlsafe(32)
                expires = now + SESSION_SECONDS
                db.execute('INSERT INTO factory_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), row['id'], expires))
                db.execute('DELETE FROM factory_login_limits WHERE bucket=?', (buckets[0][0],))
                response = {'token': token, 'expires_at': datetime.fromtimestamp(expires, timezone.utc).isoformat(), 'account': account_response(row), 'supplier_name': row['supplier_name']}
        if invalid:
            raise HTTPException(401, 'Invalid factory username or password.')
        return response

    @staticmethod
    def auth(db, token):
        if not token or len(token) > 200:
            raise HTTPException(401, 'Factory login required.')
        row = db.execute('SELECT a.*,s.name AS supplier_name,s.is_active AS supplier_active FROM factory_sessions f JOIN factory_accounts a ON a.id=f.account_id JOIN suppliers s ON s.id=a.supplier_id WHERE f.token_hash=? AND f.expires_at>?', (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
        if row is None or not row['is_active'] or not row['supplier_active']:
            raise HTTPException(401, 'Factory session expired or unavailable.')
        return row

    def logout(self, token):
        with self.catalog.transaction() as db:
            self.auth(db, token)
            db.execute('DELETE FROM factory_sessions WHERE token_hash=?', (hashlib.sha256(token.encode()).hexdigest(),))
        return {'ok': True}

    def profile(self, token):
        with self.catalog.transaction() as db:
            account = self.auth(db, token)
            return {'account': account_response(account), 'supplier_name': account['supplier_name']}

    def update_profile(self, token, body):
        invalid = False
        with self.catalog.transaction() as db:
            account = self.auth(db, token)
            if account['version'] != body.version:
                raise HTTPException(409, 'Factory account changed. Reload before saving.')
            hashed = account['password_hash']
            if body.new_password is not None:
                now = int(time.time())
                bucket = hashlib.sha256(('profile-password:' + account['id']).encode()).hexdigest()
                db.execute('DELETE FROM factory_login_limits WHERE started_at<=?', (now-900,))
                limit = db.execute('SELECT failures FROM factory_login_limits WHERE bucket=?', (bucket,)).fetchone()
                if limit and limit['failures'] >= 5:
                    raise HTTPException(429, 'Too many password attempts. Try again later.', headers={'Retry-After': '900'})
                if not password_matches(body.current_password, account['password_hash']):
                    db.execute('INSERT INTO factory_login_limits(bucket,failures,started_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET failures=failures+1', (bucket, now))
                    invalid = True
                else:
                    hashed = password_hash(body.new_password)
                    db.execute('DELETE FROM factory_login_limits WHERE bucket=?', (bucket,))
            if not invalid:
                db.execute('UPDATE factory_accounts SET display_name=?,password_hash=?,version=version+1 WHERE id=?',
                           (body.display_name, hashed, account['id']))
                if body.new_password is not None:
                    db.execute('DELETE FROM factory_sessions WHERE account_id=? AND token_hash<>?',
                               (account['id'], hashlib.sha256(token.encode()).hexdigest()))
                updated = db.execute('SELECT * FROM factory_accounts WHERE id=?', (account['id'],)).fetchone()
                response = {'account': account_response(updated), 'supplier_name': account['supplier_name']}
        if invalid:
            raise HTTPException(422, 'Current password is incorrect.')
        return response

    def workspace(self, token):
        with self.catalog.transaction() as db:
            account = self.auth(db, token)
            products = []
            for row in db.execute('SELECT p.id,p.name,p.internal_name,p.category,p.category_id,p.seasons,ps.progress_status FROM products p JOIN product_suppliers ps ON ps.product_id=p.id WHERE ps.supplier_id=? ORDER BY p.rowid', (account['supplier_id'],)):
                products.append({**dict(row), 'seasons': json.loads(row['seasons']), 'skus': [dict(sku) for sku in db.execute('SELECT id,code,color,size FROM skus WHERE product_id=? ORDER BY rowid', (row['id'],))]})
            requests = [self.request_response(db, row) for row in db.execute('SELECT r.* FROM production_requests r JOIN product_suppliers ps ON ps.product_id=r.product_id AND ps.supplier_id=r.supplier_id WHERE r.supplier_id=? ORDER BY r.rowid DESC', (account['supplier_id'],))]
            return {'account': account_response(account), 'supplier_name': account['supplier_name'], 'products': products, 'requests': requests}

    def images(self, product_id, token):
        with self.catalog.transaction() as db:
            account = self.auth(db, token)
            self.assigned(db, product_id, account['supplier_id'])
            return {'images': [dict(row) for row in db.execute("SELECT i.id,i.product_id,i.kind,i.name,i.alt,i.data_url FROM product_images i JOIN factory_image_shares s ON s.image_id=i.id AND s.product_id=i.product_id WHERE s.product_id=? AND s.supplier_id=? AND i.kind='design' ORDER BY i.rowid", (product_id, account['supplier_id']))]}

    def progress_assignment(self, db, product_id, token):
        account = self.auth(db, token) if token is not None else None
        row = db.execute('SELECT ps.*,p.version,s.name AS supplier_name FROM product_suppliers ps JOIN products p ON p.id=ps.product_id JOIN suppliers s ON s.id=ps.supplier_id WHERE ps.product_id=?', (product_id,)).fetchone()
        if row is None or (account and row['supplier_id'] != account['supplier_id']):
            raise HTTPException(404, 'Assigned product not found.')
        return row, account

    @staticmethod
    def progress_response(db, row, account):
        sql = 'SELECT status,note,actor,created_at,supplier_id,supplier_name FROM product_progress_history WHERE product_id=?'
        args = [row['product_id']]
        if account is not None:
            sql += ' AND assignment_id=?'
            args.append(row['assignment_id'])
        history = [dict(event) for event in db.execute(sql + ' ORDER BY id', args)]
        return {'product_id': row['product_id'], 'supplier_id': row['supplier_id'], 'supplier_name': row['supplier_name'],
                'status': row['progress_status'], 'version': row['version'], 'updated_at': row['progress_updated_at'], 'history': history}

    def progress(self, product_id, token=None):
        with self.catalog.transaction() as db:
            if token is None:
                row = db.execute('''SELECT p.id AS product_id,p.version,
                    COALESCE(ps.supplier_id,'') AS supplier_id,COALESCE(s.name,'') AS supplier_name,
                    COALESCE(ps.progress_status,'not_started') AS progress_status,
                    COALESCE(ps.progress_updated_at,'') AS progress_updated_at
                    FROM products p LEFT JOIN product_suppliers ps ON ps.product_id=p.id
                    LEFT JOIN suppliers s ON s.id=ps.supplier_id WHERE p.id=?''', (product_id,)).fetchone()
                if row is None:
                    raise HTTPException(404, 'Product not found.')
                return self.progress_response(db, row, None)
            row, account = self.progress_assignment(db, product_id, token)
            return self.progress_response(db, row, account)

    def update_progress(self, product_id, body, token=None):
        with self.catalog.transaction() as db:
            row, account = self.progress_assignment(db, product_id, token)
            if row['version'] != body.version:
                raise HTTPException(409, 'Product or factory progress changed. Reload before saving.')
            if row['progress_status'] == body.status and not body.note:
                return self.progress_response(db, row, account)
            now = utc_now()
            db.execute('UPDATE product_suppliers SET progress_status=?,progress_updated_at=? WHERE product_id=?', (body.status, now, product_id))
            db.execute('UPDATE products SET version=version+1 WHERE id=?', (product_id,))
            db.execute('''INSERT INTO product_progress_history(product_id,supplier_id,supplier_name,assignment_id,status,note,actor,created_at)
                VALUES(?,?,?,?,?,?,?,?)''', (product_id, row['supplier_id'], row['supplier_name'], row['assignment_id'], body.status, body.note, account['id'] if account else 'local-admin', now))
            updated, _ = self.progress_assignment(db, product_id, token)
            return self.progress_response(db, updated, account)

    def create_request(self, body):
        request_hash = hashlib.sha256(json.dumps(body.model_dump(), sort_keys=True).encode()).hexdigest()
        with self.catalog.transaction() as db:
            existing = db.execute('SELECT * FROM production_requests WHERE id=?', (body.id,)).fetchone()
            if existing:
                if existing['request_hash'] != request_hash:
                    raise HTTPException(409, 'Request identifier was reused with different data.')
                return self.request_response(db, existing)
            supplier = self.supplier(db, body.supplier_id)
            self.assigned(db, body.product_id, body.supplier_id)
            product = db.execute('SELECT * FROM products WHERE id=?', (body.product_id,)).fetchone()
            lines = []
            for line in body.lines:
                sku = db.execute('SELECT id,code,color,size FROM skus WHERE id=? AND product_id=?', (line.sku_id, body.product_id)).fetchone()
                if sku is None:
                    raise HTTPException(422, 'A requested SKU does not belong to the product.')
                lines.append({'sku_id': sku['id'], 'code': sku['code'], 'color': sku['color'], 'size': sku['size'], 'quantity': line.quantity})
            row = {**body.model_dump(), 'product_name': product['name'], 'internal_name': product['internal_name'], 'supplier_name': supplier['name'], 'lines': json.dumps(lines), 'status': 'submitted', 'version': 0, 'created_at': utc_now(), 'updated_at': utc_now(), 'request_hash': request_hash}
            db.execute('''INSERT INTO production_requests(id,product_id,supplier_id,product_name,internal_name,supplier_name,lines,due_date,note,status,version,created_at,updated_at,request_hash)
                VALUES(:id,:product_id,:supplier_id,:product_name,:internal_name,:supplier_name,:lines,:due_date,:note,:status,:version,:created_at,:updated_at,:request_hash)''', row)
            db.execute('INSERT INTO production_history(request_id,from_status,to_status,actor,created_at) VALUES(?,?,?,?,?)', (body.id, '', 'submitted', 'local-admin', row['created_at']))
            return self.request_response(db, row)

    def status(self, request_id, body, token=None):
        with self.catalog.transaction() as db:
            account = self.auth(db, token) if token is not None else None
            row = db.execute('SELECT * FROM production_requests WHERE id=?', (request_id,)).fetchone()
            if row is None or (account and row['supplier_id'] != account['supplier_id']):
                raise HTTPException(404, 'Production request not found.')
            if account:
                self.assigned(db, row['product_id'], account['supplier_id'])
            if row['version'] != body.version:
                raise HTTPException(409, 'Production request changed. Reload before updating.')
            expected = {'accepted': 'submitted', 'in_production': 'accepted', 'ready': 'in_production', 'cancelled': 'submitted'}[body.status]
            if row['status'] != expected:
                raise HTTPException(409, 'Invalid production status transition.')
            db.execute('UPDATE production_requests SET status=?,version=version+1,updated_at=? WHERE id=?', (body.status, utc_now(), request_id))
            updated = db.execute('SELECT * FROM production_requests WHERE id=?', (request_id,)).fetchone()
            db.execute('INSERT INTO production_history(request_id,from_status,to_status,actor,created_at) VALUES(?,?,?,?,?)', (request_id, row['status'], body.status, account['id'] if account else 'local-admin', updated['updated_at']))
            return self.request_response(db, updated)


def register_factory_routes(application, catalog, require_admin):
    factory = FactoryStore(catalog)
    application.add_middleware(FactoryBodyLimit)

    @application.exception_handler(RequestValidationError)
    async def factory_validation_error(request, error):
        if factory_path(request.url.path):
            return JSONResponse({'detail': 'Check the submitted field formats and limits.'}, status_code=422)
        # Invalid non-finite JSON numbers must remain 422, not fail error serialization.
        errors = jsonable_encoder(error.errors(), custom_encoder={
            float: lambda value: value if math.isfinite(value) else str(value),
        })
        return JSONResponse({'detail': errors}, status_code=422)

    def bearer(authorization: str | None = Header(default=None)):
        scheme, _, token = (authorization or '').partition(' ')
        if scheme.lower() != 'bearer' or not token:
            raise HTTPException(401, 'Factory login required.')
        return token

    @application.get('/api/v1/admin/factory-workspace', dependencies=[Depends(require_admin)])
    def admin_workspace():
        return factory.admin_workspace()

    @application.put('/api/v1/admin/products/{product_id}/suppliers', dependencies=[Depends(require_admin)])
    def assignments(product_id: str, body: ProductSuppliers):
        return factory.assignments(product_id, body)

    @application.post('/api/v1/admin/factory-accounts', status_code=201, dependencies=[Depends(require_admin)])
    def create_account(body: AccountCreate):
        return factory.create_account(body)

    @application.put('/api/v1/admin/factory-accounts/{account_id}', dependencies=[Depends(require_admin)])
    def update_account(account_id: str, body: AccountUpdate):
        return factory.update_account(account_id, body)

    @application.post('/api/v1/factory/login')
    def login(body: FactoryLogin, request: Request):
        return factory.login(body, request.client.host if request.client else 'unknown')

    @application.post('/api/v1/factory/logout')
    def logout(token: str = Depends(bearer)):
        return factory.logout(token)

    @application.get('/api/v1/factory/profile')
    def profile(token: str = Depends(bearer)):
        return factory.profile(token)

    @application.put('/api/v1/factory/profile')
    def update_profile(body: ProfileUpdate, token: str = Depends(bearer)):
        return factory.update_profile(token, body)

    @application.get('/api/v1/factory/workspace')
    def workspace(token: str = Depends(bearer)):
        return factory.workspace(token)

    @application.get('/api/v1/factory/products/{product_id}/images')
    def images(product_id: str, token: str = Depends(bearer)):
        return factory.images(product_id, token)

    @application.get('/api/v1/admin/products/{product_id}/progress', dependencies=[Depends(require_admin)])
    def admin_progress(product_id: str):
        return factory.progress(product_id)

    @application.put('/api/v1/admin/products/{product_id}/progress', dependencies=[Depends(require_admin)])
    def admin_update_progress(product_id: str, body: ProductProgressUpdate):
        return factory.update_progress(product_id, body)

    @application.get('/api/v1/factory/products/{product_id}/progress')
    def progress(product_id: str, token: str = Depends(bearer)):
        return factory.progress(product_id, token)

    @application.put('/api/v1/factory/products/{product_id}/progress')
    def update_progress(product_id: str, body: ProductProgressUpdate, token: str = Depends(bearer)):
        return factory.update_progress(product_id, body, token)

    @application.post('/api/v1/admin/production-requests', status_code=201, dependencies=[Depends(require_admin)])
    def create_request(body: ProductionCreate):
        return factory.create_request(body)

    @application.put('/api/v1/admin/production-requests/{request_id}/status', dependencies=[Depends(require_admin)])
    def admin_status(request_id: str, body: AdminStatus):
        return factory.status(request_id, body)

    @application.put('/api/v1/factory/production-requests/{request_id}/status')
    def factory_status(request_id: str, body: FactoryStatus, token: str = Depends(bearer)):
        return factory.status(request_id, body, token)
