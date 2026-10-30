"""Customer-owned checkout drafts. Payment is deliberately unavailable without a PG."""
import hashlib
import json
import re
from typing import Literal
from uuid import uuid4
from fastapi import Depends, Header, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.customer import Mutation


class BeginCheckout(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    source: Literal['cart', 'direct']
    request_id: str
    sku_id: str | None = Field(default=None, max_length=128)
    quantity: int | None = Field(default=None, ge=1, le=99)
    cart_version: int | None = Field(default=None, ge=0)
    _uuid = field_validator('request_id')(Mutation.valid_uuid.__func__)

    @model_validator(mode='after')
    def source_fields(self):
        if self.source == 'cart' and (self.cart_version is None or self.sku_id is not None or self.quantity is not None):
            raise ValueError('Cart version required.')
        if self.source == 'direct' and (not self.sku_id or self.quantity is None or self.cart_version is not None):
            raise ValueError('SKU and quantity required.')
        return self


class Shipping(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    recipient: str = Field(min_length=1, max_length=50)
    phone: str = Field(min_length=9, max_length=20)
    postal_code: str = Field(pattern=r'^\d{5}$')
    address: str = Field(min_length=5, max_length=200)
    address_detail: str = Field(min_length=1, max_length=100)
    memo: str = Field(default='', max_length=200)

    @field_validator('recipient', 'phone', 'address', 'address_detail', 'memo')
    @classmethod
    def clean(cls, value):
        if any(ord(c) < 32 or ord(c) == 127 for c in value):
            raise ValueError('Control characters are not allowed.')
        return value.strip()

    @field_validator('address_detail')
    @classmethod
    def require_address_detail(cls, value):
        if not value:
            raise ValueError('Address detail is required.')
        return value

    @model_validator(mode='after')
    def validate_address(self):
        if not self.recipient or len(self.address) < 5 or not re.fullmatch(r'0\d{8,10}', re.sub(r'[- ]', '', self.phone)):
            raise ValueError('Valid recipient, Korean phone and address required.')
        return self


class SaveCheckout(Mutation):
    shipping: Shipping
    save_address: bool = False


def tables(db):
    db.execute('CREATE TABLE IF NOT EXISTS checkout_drafts(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL,version INTEGER NOT NULL,items TEXT NOT NULL,shipping TEXT,created_at REAL NOT NULL,updated_at REAL NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS checkout_requests(customer_id TEXT NOT NULL,request_id TEXT NOT NULL,payload_hash TEXT NOT NULL,checkout_id TEXT NOT NULL,PRIMARY KEY(customer_id,request_id))')


def payload_hash(body, action):
    return hashlib.sha256(json.dumps({'action': action, **body.model_dump()}, sort_keys=True).encode()).hexdigest()


def owned(db, customer, identifier):
    row = db.execute('SELECT * FROM checkout_drafts WHERE id=? AND customer_id=?', (identifier, customer)).fetchone()
    if row is None:
        raise HTTPException(404, 'Checkout not found.')
    return row


def result(store, db, catalog_db, customer, identifier):
    row = owned(db, customer, identifier)
    items = [store.item(catalog_db, i['sku_id'], i['quantity']) for i in json.loads(row['items'])]
    total = sum(i['line_total'] or 0 for i in items)
    shipping = json.loads(row['shipping']) if row['shipping'] else None
    # A postcode is not sufficient to prove courier serviceability. Unknown fails closed.
    restricted = bool(shipping and (shipping['address'].startswith('제주') or 63000 <= int(shipping['postal_code']) <= 63644))
    delivery = 'address_required' if not shipping else 'restricted' if restricted else 'verification_required'
    return {'id': row['id'], 'status': 'draft', 'version': row['version'], 'items': items,
            'item_count': sum(i['quantity'] for i in items), 'total': total,
            'has_unavailable': any(not i['available'] for i in items), 'shipping': shipping,
            'shipping_fee': None if not shipping or restricted else (0 if total >= 50000 else 3000),
            'grand_total': None, 'delivery_status': delivery, 'payment_enabled': False,
            'created_at': row['created_at'], 'updated_at': row['updated_at']}


def register_checkout_routes(app, store):
    prefix = '/api/v1/customer/checkouts'
    def customer(authorization: str | None = Header(default=None)):
        return store.authenticate(authorization)['id']
    def no_cache(response: Response):
        response.headers['Cache-Control'] = 'no-store'
    dependencies = [Depends(no_cache)]

    @app.post(prefix, dependencies=dependencies)
    def begin(body: BeginCheckout, who=Depends(customer)):
        with store.transaction() as db, store.catalog.transaction() as catalog_db:
            tables(db)
            hashed = payload_hash(body, 'begin')
            previous = db.execute('SELECT * FROM checkout_requests WHERE customer_id=? AND request_id=?', (who, body.request_id)).fetchone()
            if previous:
                if previous['payload_hash'] != hashed:
                    raise HTTPException(409, 'Request identifier reused.')
                return result(store, db, catalog_db, who, previous['checkout_id'])
            if body.source == 'cart':
                cart = store.cart_result(db, catalog_db, who)
                if cart['version'] != body.cart_version:
                    raise HTTPException(409, 'Cart changed.')
                items = cart['items']
            else:
                items = [store.item(catalog_db, body.sku_id, body.quantity)]
            if not items or any(not i['available'] for i in items):
                raise HTTPException(409, 'Check product availability and quantity.')
            identifier = str(uuid4())
            now = store.clock()
            selection = json.dumps([{'sku_id': i['sku_id'], 'quantity': i['quantity']} for i in items])
            from app.customer_account import default_shipping
            shipping = default_shipping(db, who)
            db.execute('INSERT INTO checkout_drafts VALUES(?,?,0,?,?,?,?)', (identifier, who, selection, json.dumps(shipping) if shipping else None, now, now))
            db.execute('INSERT INTO checkout_requests VALUES(?,?,?,?)', (who, body.request_id, hashed, identifier))
            return result(store, db, catalog_db, who, identifier)

    @app.get(prefix, dependencies=dependencies)
    def listing(who=Depends(customer)):
        with store.transaction() as db, store.catalog.transaction() as catalog_db:
            tables(db)
            ids = [r['id'] for r in db.execute('SELECT id FROM checkout_drafts WHERE customer_id=? ORDER BY updated_at DESC LIMIT 50', (who,))]
            return {'checkouts': [result(store, db, catalog_db, who, identifier) for identifier in ids]}

    @app.get(prefix+'/{identifier}', dependencies=dependencies)
    def read(identifier: str, who=Depends(customer)):
        with store.transaction() as db, store.catalog.transaction() as catalog_db:
            tables(db)
            return result(store, db, catalog_db, who, identifier)

    @app.put(prefix+'/{identifier}', dependencies=dependencies)
    def save(identifier: str, body: SaveCheckout, who=Depends(customer)):
        with store.transaction() as db, store.catalog.transaction() as catalog_db:
            tables(db)
            row = owned(db, who, identifier)
            hashed = payload_hash(body, 'save:'+identifier)
            previous = db.execute('SELECT * FROM checkout_requests WHERE customer_id=? AND request_id=?', (who, body.request_id)).fetchone()
            if previous:
                if previous['payload_hash'] != hashed:
                    raise HTTPException(409, 'Request identifier reused.')
                return result(store, db, catalog_db, who, identifier)
            if row['version'] != body.version:
                raise HTTPException(409, 'Checkout changed.')
            current = result(store, db, catalog_db, who, identifier)
            if current['has_unavailable']:
                raise HTTPException(409, 'Check product availability.')
            if body.save_address:
                from app.customer_account import remember_shipping
                remember_shipping(db, who, body.shipping.model_dump())
            db.execute('UPDATE checkout_drafts SET shipping=?,version=version+1,updated_at=? WHERE id=?', (body.shipping.model_dump_json(), store.clock(), identifier))
            db.execute('INSERT INTO checkout_requests VALUES(?,?,?,?)', (who, body.request_id, hashed, identifier))
            return result(store, db, catalog_db, who, identifier)

    @app.post(prefix+'/{identifier}/payment', dependencies=dependencies)
    def payment(identifier: str, who=Depends(customer)):
        with store.transaction() as db:
            tables(db)
            owned(db, who, identifier)
        raise HTTPException(503, 'Payment provider is not configured. No inventory reserved.')
