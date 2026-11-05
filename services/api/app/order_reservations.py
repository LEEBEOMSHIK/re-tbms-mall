"""Atomic checkout-to-order conversion and pre-provider stock holds."""
import hashlib
import json
import time
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from app.shipping_policy import standard_fee

HOLD_SECONDS = 600
# WB162 creates these holds exclusively before any provider attempt. A future PG
# integration must distinguish submitted attempts before enabling this predicate.
PRE_PROVIDER = "o.status='awaiting_payment' AND o.payment_status='pending' AND o.fulfillment_status='unprepared' AND o.is_demo=0"

SHIPPING_FIELDS = ('recipient', 'phone', 'postal_code', 'address', 'address_detail', 'memo')


def timestamp(epoch):
    return datetime.fromtimestamp(epoch, timezone.utc).isoformat()


def installed(db, table='order_reservations'):
    return db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone() is not None


def initialize(db):
    if installed(db):
        return
    db.execute("""CREATE TABLE order_reservations(
        order_id TEXT PRIMARY KEY REFERENCES sales_orders(id),
        customer_id TEXT NOT NULL, checkout_id TEXT NOT NULL, checkout_version INTEGER NOT NULL,
        request_id TEXT NOT NULL, payload_hash TEXT NOT NULL, expires_at REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('held','released')),
        UNIQUE(customer_id,request_id))""")
    db.execute("CREATE UNIQUE INDEX order_reservation_active ON order_reservations(checkout_id) WHERE status='held'")
    db.execute("CREATE INDEX order_reservation_expiry ON order_reservations(expires_at) WHERE status='held'")
    db.execute('CREATE INDEX order_reservation_sku ON sales_order_lines(sku_id,order_id)')


def held_quantity(db, sku_id, now=None):
    return held_quantities(db, [sku_id], now).get(sku_id, 0)


def held_quantities(db, sku_ids, now=None):
    sku_ids = tuple(sku_ids)
    if not sku_ids or not installed(db):
        return {}
    # Only unsubmitted orders can expire locally. Unknown results stay encumbered.
    placeholders = ','.join('?' for _ in sku_ids)
    rows = db.execute(f"""SELECT l.sku_id,SUM(l.quantity) FROM sales_order_lines l
        JOIN order_reservations r ON r.order_id=l.order_id JOIN sales_orders o ON o.id=r.order_id
        WHERE l.sku_id IN ({placeholders}) AND r.status='held' AND
        (r.expires_at>? OR NOT ({PRE_PROVIDER}))
        GROUP BY l.sku_id""", (*sku_ids, time.time() if now is None else now))
    return dict(rows)


def release_expired(db, now):
    if not installed(db):
        return
    expired = db.execute(f"""SELECT r.order_id,r.expires_at FROM order_reservations r
        JOIN sales_orders o ON o.id=r.order_id WHERE r.status='held' AND r.expires_at<=?
        AND {PRE_PROVIDER}""", (now,)).fetchall()
    for row in expired:
        identifier = row['order_id']
        db.execute("UPDATE order_reservations SET status='released' WHERE order_id=?", (identifier,))
        db.execute("UPDATE sales_orders SET status='expired',payment_status='cancelled' WHERE id=?", (identifier,))
        add_event(db, identifier, '재고 확보 기간 만료', row['expires_at'])


def add_event(db, identifier, label, when):
    db.execute("""INSERT INTO sales_order_events(id,order_id,position,label,at)
        SELECT ?,?,COALESCE(MAX(position),-1)+1,?,? FROM sales_order_events WHERE order_id=?""",
        (str(uuid4()), identifier, label, timestamp(when), identifier))


def reservation_detail(db, identifier, now):
    if installed(db):
        row = db.execute(f"""SELECT r.status,r.expires_at,o.status AS order_status,
            (r.status='held' AND r.expires_at>? AND {PRE_PROVIDER}) AS can_cancel
            FROM order_reservations r JOIN sales_orders o ON r.order_id=o.id WHERE r.order_id=?""",
            (now, identifier)).fetchone()
        if row:
            reservation = {'status': row['status'], 'expires_at': timestamp(row['expires_at']), 'server_now': timestamp(now)}
            if row['status'] == 'released':
                if row['order_status'] == 'expired':
                    reservation['release_reason'] = 'expired'
                elif row['order_status'] == 'cancelled' and installed(db, 'order_cancel_requests'):
                    receipt = db.execute("SELECT 1 FROM order_cancel_requests WHERE order_id=? AND outcome='customer_cancelled' LIMIT 1", (identifier,)).fetchone()
                    if receipt:
                        reservation['release_reason'] = 'customer_cancelled'
            return {'reservation': reservation, 'can_cancel': bool(row['can_cancel'])}
    return {'can_cancel': False}


def cancel_order(orders, order_id, customer_id, request_id):
    with orders.transaction() as db:
        if not db.execute('SELECT 1 FROM sales_orders WHERE id=? AND customer_id=?', (order_id, customer_id)).fetchone():
            raise HTTPException(404, 'Order not found.')
        now = orders.clock()
        release_expired(db, now)
        detail = reservation_detail(db, order_id, now)
        if not detail['can_cancel'] and not detail.get('reservation', {}).get('release_reason'):
            raise HTTPException(409, 'Order cannot be cancelled directly.')
        db.execute("""CREATE TABLE IF NOT EXISTS order_cancel_requests(
            customer_id TEXT NOT NULL, request_id TEXT NOT NULL, order_id TEXT NOT NULL REFERENCES sales_orders(id),
            outcome TEXT NOT NULL CHECK(outcome IN ('customer_cancelled','expired')),
            PRIMARY KEY(customer_id,request_id))""")
        db.execute('CREATE INDEX IF NOT EXISTS order_cancel_receipts ON order_cancel_requests(order_id,outcome)')
        previous = db.execute('SELECT order_id FROM order_cancel_requests WHERE customer_id=? AND request_id=?',
                              (customer_id, request_id)).fetchone()
        if previous and previous['order_id'] != order_id:
            raise HTTPException(409, 'Request identifier reused.')
        if not previous:
            outcome = 'customer_cancelled' if detail['can_cancel'] else detail['reservation']['release_reason']
            db.execute('INSERT INTO order_cancel_requests VALUES(?,?,?,?)', (customer_id, request_id, order_id, outcome))
        if detail['can_cancel']:
            db.execute("UPDATE order_reservations SET status='released' WHERE order_id=?", (order_id,))
            db.execute("UPDATE sales_orders SET status='cancelled',payment_status='cancelled' WHERE id=?", (order_id,))
            add_event(db, order_id, '고객 주문 취소 및 재고 확보 해제', now)
        return orders.detail_in_transaction(db, order_id, customer_id, now)


def reserve_order(orders, db, customers, *, draft, customer_id, version, request_id,
                  shipping, expected_goods_total, expected_shipping_total, expected_lines, now=None):
    """Caller holds owned draft lock and orders.transaction(), and validated region/shipping."""
    if not db.in_transaction:
        raise ValueError('Reservation requires the order transaction.')
    if draft['customer_id'] != customer_id:
        raise HTTPException(404, 'Checkout not found.')
    now = orders.clock() if now is None else now
    checkout_id = draft['id']
    payload = [checkout_id, version, shipping, expected_goods_total, expected_shipping_total, expected_lines]
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    initialize(db)
    release_expired(db, now)
    previous = db.execute('SELECT order_id,payload_hash FROM order_reservations WHERE customer_id=? AND request_id=?',
                          (customer_id, request_id)).fetchone()
    if previous:
        if previous['payload_hash'] != digest:
            raise HTTPException(409, 'Request identifier reused.')
        return orders.detail_in_transaction(db, previous['order_id'], customer_id, now)
    if draft['version'] != version:
        raise HTTPException(409, 'Checkout changed.')
    if db.execute("SELECT 1 FROM order_reservations WHERE checkout_id=? AND status='held'", (checkout_id,)).fetchone():
        raise HTTPException(409, 'Checkout already has an active order.')

    lines = []
    prices = {}
    for selection in json.loads(draft['items']):
        sku_id, quantity = selection['sku_id'], selection['quantity']
        if type(quantity) is not int or not 1 <= quantity <= 99 or sku_id in prices:
            raise HTTPException(409, 'Invalid checkout selection.')
        line = customers.item(db, sku_id, quantity, now=now)
        if not line['available']:
            raise HTTPException(409, 'Check product availability and quantity.')
        prices[sku_id] = line['effective_price']
        lines.append(line)
    goods = sum(line['line_total'] for line in lines)
    fee = standard_fee(goods)
    if not lines or prices != expected_lines or goods != expected_goods_total or fee != expected_shipping_total:
        raise HTTPException(409, 'Review the current order prices and shipping fee.')

    identifier = str(uuid4())
    number = orders.allocate_number(db, identifier, now=datetime.fromtimestamp(now, timezone.utc))
    db.execute("""INSERT INTO sales_orders(id,public_number,customer_id,created_at,status,payment_status,
        fulfillment_status,goods_total,shipping_total,grand_total)
        VALUES(?,?,?,?,'awaiting_payment','pending','unprepared',?,?,?)""",
        (identifier, number, customer_id, timestamp(now), goods, fee, goods + fee))
    for position, line in enumerate(lines):
        db.execute('INSERT INTO sales_order_lines VALUES(?,?,?,?,?,?,?,?,?,?)',
                   (str(uuid4()), identifier, position, line['sku_id'], line['name'], line['color'],
                    line['size'], line['quantity'], line['effective_price'], line['line_total']))
    db.execute('INSERT INTO sales_order_shipping VALUES(?,?,?,?,?,?,?)',
               (identifier, *(shipping[field] for field in SHIPPING_FIELDS)))
    db.execute("INSERT INTO order_reservations VALUES(?,?,?,?,?,?,?,'held')",
               (identifier, customer_id, checkout_id, version, request_id, digest, now + HOLD_SECONDS))
    add_event(db, identifier, '주문 생성 및 재고 확보', now)
    return orders.detail_in_transaction(db, identifier, customer_id, now)
