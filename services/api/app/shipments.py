"""Factory dispatch and internal receipt/inspection; stock only at finished confirmation."""
from datetime import date
import hashlib
import json
from typing import Literal
from uuid import UUID, uuid4
from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.factory import FactoryStore, utc_now


def migrate_shipments(db):
    db.execute('''CREATE TABLE shipments (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('sample','finished')),
        product_id TEXT NOT NULL REFERENCES products(id), supplier_id TEXT NOT NULL REFERENCES suppliers(id),
        product_name TEXT NOT NULL, internal_name TEXT NOT NULL, supplier_name TEXT NOT NULL,
        production_request_id TEXT NOT NULL, design_revision TEXT NOT NULL,
        shipped_on TEXT NOT NULL, carrier TEXT NOT NULL, tracking_number TEXT NOT NULL, note TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('dispatched','received','inspected','confirmed')),
        version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        received_on TEXT NOT NULL DEFAULT '', receipt_note TEXT NOT NULL DEFAULT '',
        inspection_note TEXT NOT NULL DEFAULT '', sample_verdict TEXT NOT NULL DEFAULT '',
        confirmed_at TEXT NOT NULL DEFAULT '', lines TEXT NOT NULL, request_hash TEXT NOT NULL)''')
    db.execute('CREATE INDEX shipments_supplier ON shipments(supplier_id,status)')
    db.execute('CREATE INDEX shipments_request ON shipments(production_request_id)')
    db.execute('''CREATE TABLE shipment_history (
        id INTEGER PRIMARY KEY, shipment_id TEXT NOT NULL REFERENCES shipments(id),
        from_status TEXT NOT NULL, to_status TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL)''')
    db.execute('''CREATE TABLE shipment_stock_links (
        line_id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL REFERENCES shipments(id),
        movement_id TEXT NOT NULL UNIQUE REFERENCES movements(id))''')
    db.execute('PRAGMA user_version=13')


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, str_strip_whitespace=True)


def valid_day(value):
    try:
        if date.fromisoformat(value).isoformat() != value:
            raise ValueError()
    except ValueError:
        raise ValueError('Use YYYY-MM-DD.') from None
    if date.fromisoformat(value) > date.today():
        raise ValueError('Future dispatch or receipt dates are not allowed.')
    return value


class DispatchLine(Input):
    sku_id: str = Field(default='', max_length=64)
    color: str = Field(default='', max_length=80)
    size: str = Field(default='', max_length=80)
    quantity: int = Field(ge=1, le=1000000)


class ShipmentCreate(Input):
    id: str
    kind: Literal['sample', 'finished']
    product_id: str = Field(min_length=1, max_length=64)
    production_request_id: str = Field(default='', max_length=64)
    design_revision: str = Field(default='', max_length=120)
    shipped_on: str
    carrier: str = Field(default='', max_length=80)
    tracking_number: str = Field(default='', max_length=120)
    note: str = Field(default='', max_length=2000)
    lines: list[DispatchLine] = Field(min_length=1, max_length=100)

    @field_validator('id')
    @classmethod
    def uuid_id(cls, value):
        return str(UUID(value))

    @field_validator('shipped_on')
    @classmethod
    def day(cls, value):
        return valid_day(value)

    @model_validator(mode='after')
    def purpose(self):
        if self.kind == 'sample':
            if not self.design_revision or self.production_request_id or any(x.sku_id or not x.color or not x.size for x in self.lines):
                raise ValueError('Samples require revision and color/size, without production request or SKU.')
            keys = [(x.color.casefold(), x.size.casefold()) for x in self.lines]
        else:
            if not self.production_request_id or self.design_revision or any(not x.sku_id or x.color or x.size for x in self.lines):
                raise ValueError('Finished dispatch requires production request and SKU lines.')
            keys = [x.sku_id for x in self.lines]
        if len(set(keys)) != len(keys):
            raise ValueError('Duplicate dispatch lines.')
        return self


class Version(Input):
    version: int = Field(ge=0, le=2147483647)


class ReceivedLine(Input):
    line_id: str = Field(min_length=1, max_length=64)
    received_quantity: int = Field(ge=0, le=1000000)


class Receive(Version):
    received_on: str
    note: str = Field(default='', max_length=2000)
    lines: list[ReceivedLine] = Field(min_length=1, max_length=100)

    @field_validator('received_on')
    @classmethod
    def day(cls, value):
        return valid_day(value)


class InspectedLine(Input):
    line_id: str = Field(min_length=1, max_length=64)
    accepted_quantity: int = Field(ge=0, le=1000000)
    rejected_quantity: int = Field(ge=0, le=1000000)


class Inspect(Version):
    note: str = Field(default='', max_length=2000)
    sample_verdict: Literal['', 'approved', 'revision_requested'] = ''
    lines: list[InspectedLine] = Field(min_length=1, max_length=100)


class ShipmentStore:
    def __init__(self, catalog):
        self.catalog = catalog

    @staticmethod
    def response(db, row):
        result = {k: row[k] for k in row.keys() if k != 'request_hash'}
        result['lines'] = json.loads(row['lines'])
        result['history'] = [dict(x) for x in db.execute('SELECT from_status,to_status,actor,created_at FROM shipment_history WHERE shipment_id=? ORDER BY id', (row['id'],))]
        return result

    @staticmethod
    def find(db, shipment_id, token=None):
        account = FactoryStore.auth(db, token) if token is not None else None
        row = db.execute('SELECT * FROM shipments WHERE id=?', (shipment_id,)).fetchone()
        if row is None or (account is not None and row['supplier_id'] != account['supplier_id']):
            raise HTTPException(404, 'Shipment not found.')
        return row

    def listing(self, token=None):
        with self.catalog.transaction() as db:
            if token is not None:
                account = FactoryStore.auth(db, token)
                rows = db.execute('SELECT * FROM shipments WHERE supplier_id=? ORDER BY created_at DESC,rowid DESC', (account['supplier_id'],)).fetchall()
            else:
                rows = db.execute('SELECT * FROM shipments ORDER BY created_at DESC,rowid DESC').fetchall()
            return {'shipments': [self.response(db, row) for row in rows]}

    def detail(self, shipment_id, token=None):
        with self.catalog.transaction() as db:
            return self.response(db, self.find(db, shipment_id, token))

    def create(self, body, token):
        digest = hashlib.sha256(json.dumps(body.model_dump(), sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        with self.catalog.transaction() as db:
            account = FactoryStore.auth(db, token)
            old = db.execute('SELECT * FROM shipments WHERE id=?', (body.id,)).fetchone()
            if old is not None:
                if old['supplier_id'] != account['supplier_id']:
                    raise HTTPException(404, 'Shipment not found.')
                if old['request_hash'] != digest:
                    raise HTTPException(409, 'Shipment ID was already used for different data.')
                return self.response(db, old)
            FactoryStore.assigned(db, body.product_id, account['supplier_id'])
            product = db.execute('SELECT * FROM products WHERE id=?', (body.product_id,)).fetchone()
            requested = {}
            used = {}
            if body.kind == 'finished':
                request = db.execute('SELECT * FROM production_requests WHERE id=? AND product_id=? AND supplier_id=?', (body.production_request_id, body.product_id, account['supplier_id'])).fetchone()
                if request is None:
                    raise HTTPException(404, 'Production request not found.')
                if request['status'] != 'ready':
                    raise HTTPException(409, 'Production must be ready before dispatch.')
                requested = {x['sku_id']: x for x in json.loads(request['lines'])}
                for previous in db.execute('SELECT lines FROM shipments WHERE production_request_id=?', (body.production_request_id,)):
                    for line in json.loads(previous['lines']):
                        used[line['sku_id']] = used.get(line['sku_id'], 0) + line['quantity']
            lines = []
            for item in body.lines:
                color, size, code = item.color, item.size, ''
                if body.kind == 'finished':
                    if item.sku_id not in requested:
                        raise HTTPException(422, 'SKU is not in this production request.')
                    sku = db.execute('SELECT * FROM skus WHERE id=? AND product_id=?', (item.sku_id, body.product_id)).fetchone()
                    if sku is None:
                        raise HTTPException(422, 'SKU is unavailable.')
                    if item.quantity + used.get(item.sku_id, 0) > requested[item.sku_id]['quantity']:
                        raise HTTPException(409, 'Dispatch exceeds the remaining requested quantity.')
                    color, size, code = sku['color'], sku['size'], sku['code']
                lines.append({'id': str(uuid4()), 'sku_id': item.sku_id, 'code': code, 'color': color, 'size': size,
                              'quantity': item.quantity, 'received_quantity': 0, 'accepted_quantity': 0, 'rejected_quantity': 0, 'movement_id': ''})
            now = utc_now()
            row = {**body.model_dump(exclude={'lines'}), 'supplier_id': account['supplier_id'], 'supplier_name': account['supplier_name'],
                   'product_name': product['name'], 'internal_name': product['internal_name'], 'status': 'dispatched', 'version': 0,
                   'created_at': now, 'updated_at': now, 'lines': json.dumps(lines, ensure_ascii=False), 'request_hash': digest}
            columns = ','.join(row)
            db.execute(f'INSERT INTO shipments({columns}) VALUES({",".join(":"+k for k in row)})', row)
            self.history(db, body.id, '', 'dispatched', account['display_name'], now)
            return self.response(db, self.find(db, body.id))

    @staticmethod
    def history(db, sid, before, after, actor, now):
        db.execute('INSERT INTO shipment_history(shipment_id,from_status,to_status,actor,created_at) VALUES(?,?,?,?,?)', (sid, before, after, actor, now))

    @staticmethod
    def transition(row, body, expected):
        if row['version'] != body.version:
            raise HTTPException(409, 'Shipment changed. Reload before saving.')
        if row['status'] != expected:
            raise HTTPException(409, 'Shipment is not in the required state.')

    @staticmethod
    def line_map(lines, submitted):
        ids = [x.line_id for x in submitted]
        if len(set(ids)) != len(ids) or set(ids) != {x['id'] for x in lines}:
            raise HTTPException(422, 'Supply each shipment line exactly once.')
        return {x.line_id: x for x in submitted}

    def receive(self, shipment_id, body):
        with self.catalog.transaction() as db:
            row = self.find(db, shipment_id)
            self.transition(row, body, 'dispatched')
            if body.received_on < row['shipped_on']:
                raise HTTPException(422, 'Receipt cannot precede dispatch.')
            lines = json.loads(row['lines']); mapped = self.line_map(lines, body.lines)
            for line in lines:
                count = mapped[line['id']].received_quantity
                if count > line['quantity']:
                    raise HTTPException(422, 'Receipt exceeds dispatched quantity.')
                line['received_quantity'] = count
            now = utc_now()
            db.execute("UPDATE shipments SET status='received',version=version+1,received_on=?,receipt_note=?,lines=?,updated_at=? WHERE id=?", (body.received_on, body.note, json.dumps(lines, ensure_ascii=False), now, shipment_id))
            self.history(db, shipment_id, 'dispatched', 'received', 'local-admin', now)
            return self.response(db, self.find(db, shipment_id))

    def inspect(self, shipment_id, body):
        with self.catalog.transaction() as db:
            row = self.find(db, shipment_id)
            self.transition(row, body, 'received')
            if (row['kind'] == 'sample') != bool(body.sample_verdict):
                raise HTTPException(422, 'Sample verdict is required only for samples.')
            lines = json.loads(row['lines']); mapped = self.line_map(lines, body.lines)
            for line in lines:
                item = mapped[line['id']]
                if item.accepted_quantity + item.rejected_quantity != line['received_quantity']:
                    raise HTTPException(422, 'Accepted and rejected counts must equal received quantity.')
                line.update(accepted_quantity=item.accepted_quantity, rejected_quantity=item.rejected_quantity)
            if row['kind'] == 'sample' and body.sample_verdict == 'approved' and not sum(x['accepted_quantity'] for x in lines):
                raise HTTPException(422, 'Sample approval requires at least one accepted sample.')
            now = utc_now()
            db.execute("UPDATE shipments SET status='inspected',version=version+1,inspection_note=?,sample_verdict=?,lines=?,updated_at=? WHERE id=?", (body.note, body.sample_verdict, json.dumps(lines, ensure_ascii=False), now, shipment_id))
            self.history(db, shipment_id, 'received', 'inspected', 'local-admin', now)
            return self.response(db, self.find(db, shipment_id))

    def confirm(self, shipment_id, body):
        from app.inventory import MovementCreate
        with self.catalog.transaction() as db:
            row = self.find(db, shipment_id)
            if row['kind'] != 'finished':
                raise HTTPException(409, 'Samples never enter sale stock.')
            if row['status'] == 'confirmed' and body.version in (row['version'], row['version'] - 1):
                return self.response(db, row)
            self.transition(row, body, 'inspected')
            lines = json.loads(row['lines'])
            for line in lines:
                if line['accepted_quantity'] == 0:
                    continue
                sku = db.execute('SELECT version FROM skus WHERE id=?', (line['sku_id'],)).fetchone()
                if sku is None:
                    raise HTTPException(409, 'SKU no longer exists.')
                movement = self.catalog.apply_movement(db, MovementCreate(sku_id=line['sku_id'], version=sku['version'],
                    delta=line['accepted_quantity'], reason_code='receipt', reason=f"완제품 발송 입고 확정 · {shipment_id}",
                    supplier_id=row['supplier_id'], request_id=str(uuid4())), supplier_snapshot=row['supplier_name'])
                line['movement_id'] = movement['id']
                db.execute('INSERT INTO shipment_stock_links(line_id,shipment_id,movement_id) VALUES(?,?,?)', (line['id'], shipment_id, movement['id']))
            now = utc_now()
            db.execute("UPDATE shipments SET status='confirmed',version=version+1,confirmed_at=?,updated_at=?,lines=? WHERE id=?", (now, now, json.dumps(lines, ensure_ascii=False), shipment_id))
            self.history(db, shipment_id, 'inspected', 'confirmed', 'local-admin', now)
            return self.response(db, self.find(db, shipment_id))


def register_shipment_routes(application, catalog, require_admin):
    store = ShipmentStore(catalog)
    def bearer(authorization: str | None = Header(default=None)):
        scheme, _, token = (authorization or '').partition(' ')
        if scheme.lower() != 'bearer' or not token:
            raise HTTPException(401, 'Factory login required.')
        return token

    @application.get('/api/v1/factory/shipments')
    def factory_list(token: str = Depends(bearer)):
        return store.listing(token)

    @application.get('/api/v1/factory/shipments/{shipment_id}')
    def factory_detail(shipment_id: str, token: str = Depends(bearer)):
        return store.detail(shipment_id, token)

    @application.post('/api/v1/factory/shipments', status_code=201)
    def factory_create(body: ShipmentCreate, token: str = Depends(bearer)):
        return store.create(body, token)

    @application.get('/api/v1/admin/shipments', dependencies=[Depends(require_admin)])
    def admin_list():
        return store.listing()

    @application.get('/api/v1/admin/shipments/{shipment_id}', dependencies=[Depends(require_admin)])
    def admin_detail(shipment_id: str):
        return store.detail(shipment_id)

    @application.put('/api/v1/admin/shipments/{shipment_id}/receive', dependencies=[Depends(require_admin)])
    def receive(shipment_id: str, body: Receive):
        return store.receive(shipment_id, body)

    @application.put('/api/v1/admin/shipments/{shipment_id}/inspect', dependencies=[Depends(require_admin)])
    def inspect(shipment_id: str, body: Inspect):
        return store.inspect(shipment_id, body)

    @application.put('/api/v1/admin/shipments/{shipment_id}/confirm', dependencies=[Depends(require_admin)])
    def confirm(shipment_id: str, body: Version):
        return store.confirm(shipment_id, body)
