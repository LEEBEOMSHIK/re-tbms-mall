"""Read-only sales order snapshots. No checkout conversion, payment or stock writes."""
import base64
import binascii
from contextlib import closing, contextmanager
from datetime import date, datetime, time, timedelta, timezone
import hashlib
import json
import re
import sqlite3
from typing import Literal
from uuid import UUID, uuid4

from fastapi import Depends, Header, HTTPException, Query, Response
from .order_numbers import allocate_order_number

OrderStatus = Literal['awaiting_payment', 'confirmed', 'closed', 'cancelled', 'expired']
PaymentStatus = Literal['pending', 'succeeded', 'failed', 'cancelled', 'unknown']
FulfillmentStatus = Literal['unprepared', 'preparing', 'partially_shipped', 'shipped', 'delivered']
SearchField = Literal['all', 'number', 'product', 'recipient', 'phone']
SUMMARY_COLUMNS = ('id', 'created_at', 'status', 'payment_status', 'fulfillment_status',
                   'goods_total', 'shipping_total', 'grand_total')

# This extension has its own version; catalogue user_version remains owned by CatalogStore.
SCHEMA = [
    'CREATE TABLE sales_order_schema(version INTEGER NOT NULL CHECK(version=1))',
    'INSERT INTO sales_order_schema VALUES(1)',
    '''CREATE TABLE sales_orders(
        id TEXT PRIMARY KEY, public_number TEXT NOT NULL UNIQUE, customer_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('awaiting_payment','confirmed','closed','cancelled','expired')),
        payment_status TEXT NOT NULL CHECK(payment_status IN ('pending','succeeded','failed','cancelled','unknown')),
        fulfillment_status TEXT NOT NULL CHECK(fulfillment_status IN ('unprepared','preparing','partially_shipped','shipped','delivered')),
        goods_total INTEGER NOT NULL CHECK(typeof(goods_total)='integer' AND goods_total>=0),
        shipping_total INTEGER NOT NULL CHECK(typeof(shipping_total)='integer' AND shipping_total>=0),
        grand_total INTEGER NOT NULL CHECK(typeof(grand_total)='integer' AND grand_total>=0 AND grand_total=goods_total+shipping_total),
        is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0,1)))''',
    'CREATE INDEX sales_orders_customer_page ON sales_orders(customer_id,created_at DESC,id DESC)',
    'CREATE INDEX sales_orders_admin_page ON sales_orders(created_at DESC,id DESC)',
    'CREATE INDEX sales_orders_customer_status_page ON sales_orders(customer_id,status,created_at DESC,id DESC)',
    'CREATE INDEX sales_orders_admin_status_page ON sales_orders(status,created_at DESC,id DESC)',
    '''CREATE TABLE sales_order_lines(
        id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES sales_orders(id), position INTEGER NOT NULL,
        sku_id TEXT NOT NULL, product_name TEXT NOT NULL, color TEXT NOT NULL, size TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity>0),
        unit_price INTEGER NOT NULL CHECK(typeof(unit_price)='integer' AND unit_price>=0),
        line_total INTEGER NOT NULL CHECK(typeof(line_total)='integer' AND line_total=quantity*unit_price),
        UNIQUE(order_id,position))''',
    '''CREATE TABLE sales_order_shipping(
        order_id TEXT PRIMARY KEY REFERENCES sales_orders(id), recipient TEXT NOT NULL, phone TEXT NOT NULL,
        postal_code TEXT NOT NULL, address TEXT NOT NULL, address_detail TEXT NOT NULL, memo TEXT NOT NULL)''',
    '''CREATE TABLE sales_order_shipments(
        id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES sales_orders(id), carrier TEXT NOT NULL,
        tracking_number TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('unprepared','preparing','shipped','delivered')),
        quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity>0))''',
    'CREATE INDEX sales_order_shipments_order ON sales_order_shipments(order_id)',
    '''CREATE TABLE sales_order_events(
        id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES sales_orders(id), position INTEGER NOT NULL,
        label TEXT NOT NULL, at TEXT NOT NULL, UNIQUE(order_id,position))''',
]


def encode_cursor(row, status):
    return base64.urlsafe_b64encode(json.dumps([row['created_at'], row['id'], status], separators=(',', ':')).encode()).decode().rstrip('=')


def decode_cursor(cursor, status):
    if cursor is None:
        return None
    try:
        raw = base64.b64decode(cursor + '=' * (-len(cursor) % 4), altchars=b'-_', validate=True)
        values = json.loads(raw)
        if not isinstance(values, list) or len(values) != 3:
            raise ValueError()
        at, order_id, filter_status = values
        if not isinstance(at, str) or len(at) > 40 or not isinstance(order_id, str) or str(UUID(order_id)) != order_id or filter_status != status:
            raise ValueError()
        parsed = datetime.fromisoformat(at.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            raise ValueError()
        return at, order_id
    except (ValueError, TypeError, UnicodeDecodeError, binascii.Error):
        raise HTTPException(422, 'Invalid order cursor; restart the list.') from None


def normalize_phone(value):
    return re.sub(r'[-\s]', '', value)


def utc_timestamp(value):
    # Preserve microseconds at inclusive calendar boundaries, unlike SQLite's
    # millisecond-rounded julianday/date functions. Stored offsets are supported.
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc).isoformat(timespec='microseconds')


def admin_search(*, status, search_field, q, date_from, date_to, payment_status, fulfillment_status):
    q = q.strip()
    if len(q) > 100:
        raise HTTPException(422, 'Search text must be at most 100 characters.')
    bounds = []
    try:
        for value, end in [(date_from, False), (date_to, True)]:
            if value is None:
                bounds.append(None)
                continue
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
                raise ValueError()
            day = date.fromisoformat(value)
            if end:
                day += timedelta(days=1)
            bounds.append(datetime.combine(day, time(), tzinfo=timezone(timedelta(hours=9))).astimezone(timezone.utc).isoformat(timespec='microseconds'))
        if date_from is not None and date_to is not None and date_from > date_to:
            raise ValueError()
    except (ValueError, OverflowError):
        raise HTTPException(422, 'Use valid YYYY-MM-DD dates in chronological order.') from None
    filters = {'status': status, 'search_field': search_field, 'q': q,
               'date_from': date_from, 'date_to': date_to,
               'payment_status': payment_status, 'fulfillment_status': fulfillment_status}
    fingerprint = 'admin:' + hashlib.sha256(json.dumps(filters, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    return filters, bounds, fingerprint


class SalesOrderStore:
    def __init__(self, catalog):
        self.catalog = catalog

    @contextmanager
    def transaction(self):
        existed = self.catalog.path.exists()
        with self.catalog.transaction() as db:
            marker = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sales_order_schema'").fetchone()
            if marker is None:
                # BEGIN IMMEDIATE holds the writer lock. A separate read connection can
                # back up committed catalogue state before any extension DDL is applied.
                if existed:
                    backup_path = self.catalog.path.with_name(self.catalog.path.name + '.pre-sales-orders-' + str(uuid4()) + '.bak')
                    with closing(sqlite3.connect(self.catalog.path)) as source, closing(sqlite3.connect(backup_path)) as backup:
                        source.backup(backup)
                for sql in SCHEMA:
                    db.execute(sql)
            versions = db.execute('SELECT version FROM sales_order_schema').fetchall()
            if len(versions) != 1 or versions[0][0] != 1:
                raise HTTPException(503, 'Unsupported sales order storage version.')
            yield db

    @staticmethod
    def allocate_number(db, order_id, *, now=None):
        """Internal hook for future order creation; use this same db for INSERT."""
        return allocate_order_number(db, order_id, now=now)

    @staticmethod
    def summary(db, row):
        lines = db.execute('SELECT product_name,quantity,line_total FROM sales_order_lines WHERE order_id=? ORDER BY position', (row['id'],)).fetchall()
        if not lines or sum(line['line_total'] for line in lines) != row['goods_total']:
            raise HTTPException(503, 'Order snapshot is incomplete; contact the administrator.')
        label = lines[0]['product_name']
        if len(lines) > 1:
            label += f' 외 {len(lines) - 1}개 품목'
        return {**{key: row[key] for key in SUMMARY_COLUMNS}, 'number': row['public_number'],
                'is_demo': bool(row['is_demo']), 'item_count': sum(line['quantity'] for line in lines), 'summary': label}

    def list(self, customer_id=None, *, limit=20, cursor=None, status=None, search=None):
        cursor_scope = search[2] if search is not None else status
        point = decode_cursor(cursor, cursor_scope)
        clauses, params = [], []
        if customer_id is not None:
            clauses.append('customer_id=?')
            params.append(customer_id)
        if status is not None:
            clauses.append('status=?')
            params.append(status)
        if search is not None:
            filters, bounds, _ = search
            for column in ('payment_status', 'fulfillment_status'):
                if filters[column] is not None:
                    clauses.append(column + '=?')
                    params.append(filters[column])
            for bound, operator in zip(bounds, ('>=', '<')):
                if bound is not None:
                    clauses.append(f'order_utc(created_at){operator}?')
                    params.append(bound)
            if filters['q']:
                q = filters['q']
                phone = normalize_phone(q)
                matches = {
                    'number': ('instr(public_number,?)>0', [q]),
                    'product': ('EXISTS(SELECT 1 FROM sales_order_lines l WHERE l.order_id=sales_orders.id AND instr(l.product_name,?)>0)', [q]),
                    'recipient': ('EXISTS(SELECT 1 FROM sales_order_shipping s WHERE s.order_id=sales_orders.id AND instr(s.recipient,?)>0)', [q]),
                    'phone': ('EXISTS(SELECT 1 FROM sales_order_shipping s WHERE s.order_id=sales_orders.id AND instr(order_phone(s.phone),?)>0)', [phone]) if phone else ('0', []),
                }
                selected = matches.values() if filters['search_field'] == 'all' else [matches[filters['search_field']]]
                alternatives = []
                for sql, values in selected:
                    alternatives.append(sql)
                    params.extend(values)
                clauses.append('(' + ' OR '.join(alternatives) + ')')
        if point:
            clauses.append('(created_at,id)<(?,?)')
            params.extend(point)
        where = ' WHERE ' + ' AND '.join(clauses) if clauses else ''
        with self.transaction() as db:
            if search is not None:
                db.create_function('order_phone', 1, normalize_phone, deterministic=True)
                db.create_function('order_utc', 1, utc_timestamp, deterministic=True)
            rows = db.execute('SELECT * FROM sales_orders' + where + ' ORDER BY created_at DESC,id DESC LIMIT ?', (*params, limit + 1)).fetchall()
            visible = rows[:limit]
            return {'orders': [self.summary(db, row) for row in visible],
                    'next_cursor': encode_cursor(visible[-1], cursor_scope) if len(rows) > limit else None}

    def detail(self, order_id, customer_id=None):
        try:
            order_id = str(UUID(order_id))
        except ValueError:
            raise HTTPException(404, 'Order not found.') from None
        with self.transaction() as db:
            sql = 'SELECT * FROM sales_orders WHERE id=?'
            params = [order_id]
            if customer_id is not None:
                sql += ' AND customer_id=?'
                params.append(customer_id)
            row = db.execute(sql, params).fetchone()
            if row is None:
                raise HTTPException(404, 'Order not found.')
            shipping = db.execute('SELECT recipient,phone,postal_code,address,address_detail,memo FROM sales_order_shipping WHERE order_id=?', (order_id,)).fetchone()
            if shipping is None:
                raise HTTPException(503, 'Order shipping snapshot is incomplete.')
            return {**self.summary(db, row), 'shipping': dict(shipping),
                    'lines': [dict(line) for line in db.execute('SELECT id,product_name,color,size,quantity,unit_price,line_total FROM sales_order_lines WHERE order_id=? ORDER BY position', (order_id,))],
                    'shipments': [dict(shipment) for shipment in db.execute('SELECT id,carrier,tracking_number,status,quantity FROM sales_order_shipments WHERE order_id=? ORDER BY rowid', (order_id,))],
                    'events': [dict(event) for event in db.execute('SELECT id,label,at FROM sales_order_events WHERE order_id=? ORDER BY position', (order_id,))]}


def register_sales_order_routes(app, catalog, customers, require_admin):
    store = SalesOrderStore(catalog)

    def no_cache(response: Response):
        response.headers['Cache-Control'] = 'no-store'

    def customer(authorization: str | None = Header(default=None)):
        return customers.authenticate(authorization)

    @app.get('/api/v1/customer/sales-orders', dependencies=[Depends(no_cache)])
    def customer_orders(who=Depends(customer), q: str = Query(default='', max_length=1000), limit: int = Query(default=20, ge=1, le=50), cursor: str | None = Query(default=None, max_length=1024), status: OrderStatus | None = None,
                        date_from: str | None = Query(default=None, max_length=10), date_to: str | None = Query(default=None, max_length=10),
                        payment_status: PaymentStatus | None = None, fulfillment_status: FulfillmentStatus | None = None):
        search = admin_search(status=status, search_field='product', q=q, date_from=date_from, date_to=date_to, payment_status=payment_status, fulfillment_status=fulfillment_status) if any((q,date_from,date_to,payment_status,fulfillment_status)) else None
        return store.list(who['id'], limit=limit, cursor=cursor, status=status, search=search)

    @app.get('/api/v1/customer/sales-orders/{order_id}', dependencies=[Depends(no_cache)])
    def customer_order(order_id: str, who=Depends(customer)):
        return store.detail(order_id, who['id'])

    @app.get('/api/v1/admin/sales-orders', dependencies=[Depends(require_admin), Depends(no_cache)])
    def admin_orders(limit: int = Query(default=20, ge=1, le=50), cursor: str | None = Query(default=None, max_length=1024), status: OrderStatus | None = None,
                     search_field: SearchField = 'all', q: str = Query(default='', max_length=1000),
                     date_from: str | None = Query(default=None, max_length=10), date_to: str | None = Query(default=None, max_length=10),
                     payment_status: PaymentStatus | None = None, fulfillment_status: FulfillmentStatus | None = None):
        search = admin_search(status=status, search_field=search_field, q=q, date_from=date_from, date_to=date_to, payment_status=payment_status, fulfillment_status=fulfillment_status)
        return store.list(limit=limit, cursor=cursor, status=status, search=search)

    @app.get('/api/v1/admin/sales-orders/{order_id}', dependencies=[Depends(require_admin), Depends(no_cache)])
    def admin_order(order_id: str):
        return store.detail(order_id)
