"""Internal order-number allocation; never expose this as an unauthenticated API.

Call within the order creation transaction, after validating the customer and
idempotency key. Persist the returned number in sales_orders before committing.
"""
from datetime import datetime, timedelta, timezone
import secrets
import sqlite3
from uuid import UUID

KST = timezone(timedelta(hours=9))
ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'  # No 0, 1, I, O.
MAX_ATTEMPTS = 10


def _suffix():
    return ''.join(secrets.choice(ALPHABET) for _ in range(10))


def allocate_order_number(db: sqlite3.Connection, order_id: str, *, now=None) -> str:
    """Allocate once per canonical server-generated UUID in an active transaction.

    Caller must use BEGIN IMMEDIATE (SalesOrderStore.transaction does) and allow
    exceptions to roll back. UNIQUE constraints arbitrate concurrent allocations.
    No independent commit, network call, or business state transition is performed.
    """
    if not db.in_transaction:
        raise ValueError('Order number allocation requires an active transaction.')
    if not isinstance(order_id, str) or str(UUID(order_id)) != order_id:
        raise ValueError('A canonical server order UUID is required.')
    instant = now if now is not None else datetime.now(timezone.utc)
    if not isinstance(instant, datetime) or instant.tzinfo is None or instant.utcoffset() is None:
        raise ValueError('Order time must include a timezone.')
    day = instant.astimezone(KST).strftime('%Y%m%d')
    # Additive, transactional initialization on first allocation only. Existing
    # read-only order queries and previously issued demo numbers are unchanged.
    db.execute('''CREATE TABLE IF NOT EXISTS sales_order_number_allocations(
        order_id TEXT PRIMARY KEY NOT NULL,
        public_number TEXT NOT NULL UNIQUE,
        allocated_at TEXT NOT NULL)''')
    reserved = db.execute('SELECT public_number FROM sales_order_number_allocations WHERE order_id=?', (order_id,)).fetchone()
    existing = db.execute('SELECT public_number FROM sales_orders WHERE id=?', (order_id,)).fetchone()
    if reserved and existing and reserved[0] != existing[0]:
        raise RuntimeError('Stored order number does not match its allocation.')
    if reserved or existing:
        return (reserved or existing)[0]
    for _ in range(MAX_ATTEMPTS):
        number = day + '-' + _suffix()
        # Older orders may predate the allocation ledger.
        if db.execute('SELECT 1 FROM sales_orders WHERE public_number=?', (number,)).fetchone():
            continue
        try:
            db.execute('INSERT INTO sales_order_number_allocations VALUES(?,?,?)',
                       (order_id, number, instant.astimezone(timezone.utc).isoformat()))
            return number
        except sqlite3.IntegrityError:
            # Retry only a number collision; do not mask unrelated storage errors.
            if not db.execute('SELECT 1 FROM sales_order_number_allocations WHERE public_number=?', (number,)).fetchone():
                raise
    raise RuntimeError('Could not allocate a unique order number; retry the transaction.')
