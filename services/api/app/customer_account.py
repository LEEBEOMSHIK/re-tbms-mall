"""Optional customer-entered contact details and reusable shipping addresses."""
import json
import re
from uuid import uuid4
from fastapi import Depends, Header, HTTPException, Response
from pydantic import Field, field_validator
from app.customer import Mutation
from app.checkout import Shipping, payload_hash


class ProfileInput(Mutation):
    name: str = Field(max_length=50)
    phone: str = Field(max_length=20)
    _clean = field_validator('name', 'phone')(Shipping.clean.__func__)

    @field_validator('phone')
    @classmethod
    def phone_format(cls, value):
        if value and not re.fullmatch(r'0\d{8,10}', re.sub(r'[- ]', '', value)):
            raise ValueError('Invalid Korean phone.')
        return value


class AddressInput(Mutation):
    label: str = Field(min_length=1, max_length=30)
    shipping: Shipping
    is_default: bool = False
    _clean = field_validator('label')(Shipping.clean.__func__)

    @field_validator('label')
    @classmethod
    def nonempty(cls, value):
        if not value:
            raise ValueError('Address label required.')
        return value


def tables(db):
    db.execute("CREATE TABLE IF NOT EXISTS customer_contacts(customer_id TEXT PRIMARY KEY,version INTEGER NOT NULL DEFAULT 0,name TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '')")
    db.execute('CREATE TABLE IF NOT EXISTS customer_addresses(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL,label TEXT NOT NULL,shipping TEXT NOT NULL,is_default INTEGER NOT NULL)')
    db.execute('CREATE UNIQUE INDEX IF NOT EXISTS one_default_address ON customer_addresses(customer_id) WHERE is_default=1')
    db.execute('CREATE TABLE IF NOT EXISTS account_requests(customer_id TEXT NOT NULL,request_id TEXT NOT NULL,payload_hash TEXT NOT NULL,PRIMARY KEY(customer_id,request_id))')


def read_account(db, who):
    tables(db)
    profile = db.execute('SELECT * FROM customer_contacts WHERE customer_id=?', (who,)).fetchone()
    addresses = db.execute('SELECT * FROM customer_addresses WHERE customer_id=? ORDER BY is_default DESC,rowid', (who,)).fetchall()
    return {'version': profile['version'] if profile else 0,
            'profile': {'name': profile['name'] if profile else '', 'phone': profile['phone'] if profile else ''},
            'addresses': [{'id': r['id'], 'label': r['label'], 'shipping': json.loads(r['shipping']), 'is_default': bool(r['is_default'])} for r in addresses]}


def bump(db, who):
    db.execute('INSERT OR IGNORE INTO customer_contacts(customer_id) VALUES(?)', (who,))
    db.execute('UPDATE customer_contacts SET version=version+1 WHERE customer_id=?', (who,))


def default_shipping(db, who):
    return next((a['shipping'] for a in read_account(db, who)['addresses'] if a['is_default']), None)


def remember_shipping(db, who, shipping):
    """Called inside checkout transaction; explicit opt-in, never changes existing address."""
    account = read_account(db, who)
    if any(a['shipping'] == shipping for a in account['addresses']):
        return
    if len(account['addresses']) >= 20:
        raise HTTPException(422, 'Address book limit reached (20).')
    db.execute('INSERT INTO customer_addresses VALUES(?,?,?,?,?)', (str(uuid4()), who, '주문 배송지', json.dumps(shipping), int(not account['addresses'])))
    bump(db, who)


def register_account_routes(app, store):
    prefix = '/api/v1/customer'
    def customer(authorization: str | None = Header(default=None)):
        return store.authenticate(authorization)['id']
    def no_cache(response: Response):
        response.headers['Cache-Control'] = 'no-store'
    dependencies = [Depends(no_cache)]

    def write(who, body, action, identifier=None):
        with store.transaction() as db:
            current = read_account(db, who)
            hashed = payload_hash(body, action + (identifier or ''))
            old = db.execute('SELECT payload_hash FROM account_requests WHERE customer_id=? AND request_id=?', (who, body.request_id)).fetchone()
            if old:
                if old['payload_hash'] != hashed:
                    raise HTTPException(409, 'Request identifier reused.')
                return current
            if identifier and not any(a['id'] == identifier for a in current['addresses']):
                raise HTTPException(404, 'Address not found.')
            if current['version'] != body.version:
                raise HTTPException(409, 'Account changed. Reload before saving.')
            if action == 'profile':
                db.execute('INSERT OR IGNORE INTO customer_contacts(customer_id) VALUES(?)', (who,))
                db.execute('UPDATE customer_contacts SET name=?,phone=? WHERE customer_id=?', (body.name, body.phone, who))
            elif action == 'delete':
                db.execute('DELETE FROM customer_addresses WHERE id=? AND customer_id=?', (identifier, who))
            else:
                if action == 'create' and len(current['addresses']) >= 20:
                    raise HTTPException(422, 'Address book limit reached (20).')
                is_default = body.is_default or (action == 'create' and not current['addresses'])
                if is_default:
                    db.execute('UPDATE customer_addresses SET is_default=0 WHERE customer_id=?', (who,))
                if action == 'create':
                    db.execute('INSERT INTO customer_addresses VALUES(?,?,?,?,?)', (str(uuid4()), who, body.label, body.shipping.model_dump_json(), int(is_default)))
                else:
                    db.execute('UPDATE customer_addresses SET label=?,shipping=?,is_default=? WHERE id=? AND customer_id=?', (body.label, body.shipping.model_dump_json(), int(is_default), identifier, who))
            bump(db, who)
            db.execute('INSERT INTO account_requests VALUES(?,?,?)', (who, body.request_id, hashed))
            return read_account(db, who)

    @app.get(prefix+'/account', dependencies=dependencies)
    def read(who=Depends(customer)):
        with store.transaction() as db:
            return read_account(db, who)

    @app.put(prefix+'/account', dependencies=dependencies)
    def profile(body: ProfileInput, who=Depends(customer)):
        return write(who, body, 'profile')

    @app.post(prefix+'/addresses', dependencies=dependencies)
    def create(body: AddressInput, who=Depends(customer)):
        return write(who, body, 'create')

    @app.put(prefix+'/addresses/{identifier}', dependencies=dependencies)
    def update(identifier: str, body: AddressInput, who=Depends(customer)):
        return write(who, body, 'update', identifier)

    @app.delete(prefix+'/addresses/{identifier}', dependencies=dependencies)
    def delete(identifier: str, body: Mutation, who=Depends(customer)):
        return write(who, body, 'delete', identifier)
