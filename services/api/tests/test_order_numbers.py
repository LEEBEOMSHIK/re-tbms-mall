from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import re
import sqlite3
from uuid import uuid4

import pytest
from app import order_numbers
from app.sales_orders import SalesOrderStore
from app.inventory import CatalogStore


@pytest.fixture
def store(tmp_path):
    return SalesOrderStore(CatalogStore(tmp_path / 'numbers.sqlite3'))


@pytest.mark.parametrize('instant,day', [
    ('2026-10-31T14:59:59+00:00', '20261031'),
    ('2026-10-31T15:00:00+00:00', '20261101'),
    ('2024-02-28T15:00:00+00:00', '20240229'),
    ('2026-12-31T15:00:00+00:00', '20270101'),
])
def test_format_and_korean_calendar(store, instant, day):
    with store.transaction() as db:
        result = store.allocate_number(db, str(uuid4()), now=datetime.fromisoformat(instant))
    assert re.fullmatch(day + r'-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}', result)


def test_restart_and_retry_keep_original_number(store):
    order_id = str(uuid4())
    with store.transaction() as db:
        first = store.allocate_number(db, order_id, now=datetime(2026, 11, 1, tzinfo=timezone.utc))
    reopened = SalesOrderStore(CatalogStore(store.catalog.path))
    with reopened.transaction() as db:
        assert reopened.allocate_number(db, order_id, now=datetime(2026, 11, 2, tzinfo=timezone.utc)) == first
        assert db.execute('SELECT count(*) FROM sales_order_number_allocations').fetchone()[0] == 1


def test_collision_retries_and_exhaustion(store, monkeypatch):
    monkeypatch.setattr(order_numbers, '_suffix', lambda: 'AAAAAAAAAA')
    with store.transaction() as db:
        store.allocate_number(db, str(uuid4()))
        with pytest.raises(RuntimeError, match='unique order number'):
            store.allocate_number(db, str(uuid4()))
        candidates = iter(['AAAAAAAAAA', 'BBBBBBBBBB'])
        monkeypatch.setattr(order_numbers, '_suffix', lambda: next(candidates))
        assert store.allocate_number(db, str(uuid4())).endswith('-BBBBBBBBBB')


def test_rollback_does_not_leave_allocation(store):
    order_id = str(uuid4())
    # Initialize the ledger so this tests both row rollback and normal reuse.
    with store.transaction() as db:
        store.allocate_number(db, str(uuid4()))
    with pytest.raises(RuntimeError, match='order insert failed'):
        with store.transaction() as db:
            store.allocate_number(db, order_id)
            raise RuntimeError('order insert failed')
    with store.transaction() as db:
        assert db.execute('SELECT 1 FROM sales_order_number_allocations WHERE order_id=?', (order_id,)).fetchone() is None


def test_requires_transaction_uuid_and_aware_clock(store):
    with sqlite3.connect(':memory:') as db:
        with pytest.raises(ValueError, match='transaction'):
            order_numbers.allocate_order_number(db, str(uuid4()))
    with store.transaction() as db:
        with pytest.raises(ValueError):
            store.allocate_number(db, 'customer-id')
        with pytest.raises(ValueError, match='timezone'):
            store.allocate_number(db, str(uuid4()), now=datetime(2026, 11, 1))


def test_parallel_connections_unique_and_same_order_idempotent(store):
    with store.transaction():
        pass
    def allocate(order_id):
        with store.transaction() as db:
            return store.allocate_number(db, order_id)
    ids = [str(uuid4()) for _ in range(60)]
    with ThreadPoolExecutor(max_workers=8) as pool:
        numbers = list(pool.map(allocate, ids))
        repeated = list(pool.map(allocate, [ids[0]] * 20))
    assert len(set(numbers)) == 60
    assert set(repeated) == {numbers[0]}


def test_legacy_number_collision_and_preservation(store, monkeypatch):
    order_id = str(uuid4())
    instant = datetime(2026, 11, 1, tzinfo=timezone.utc)
    with store.transaction() as db:
        db.execute('''INSERT INTO sales_orders VALUES(?,?,?,?,?,?,?,?,?,?,?)''',
                   (order_id, '20261101-AAAAAAAAAA', str(uuid4()), instant.isoformat(),
                    'awaiting_payment','pending','unprepared',0,0,0,1))
        assert store.allocate_number(db, order_id) == '20261101-AAAAAAAAAA'
        candidates = iter(['AAAAAAAAAA', 'CCCCCCCCCC'])
        monkeypatch.setattr(order_numbers, '_suffix', lambda: next(candidates))
        assert store.allocate_number(db, str(uuid4()), now=instant) == '20261101-CCCCCCCCCC'


def test_number_and_order_insert_commit_together(store):
    order_id = str(uuid4())
    with store.transaction() as db:
        number = store.allocate_number(db, order_id)
        db.execute('INSERT INTO sales_orders VALUES(?,?,?,?,?,?,?,?,?,?,?)',
                   (order_id, number, str(uuid4()), datetime.now(timezone.utc).isoformat(),
                    'awaiting_payment','pending','unprepared',0,0,0,1))
    with store.transaction() as db:
        assert store.allocate_number(db, order_id) == number
        assert db.execute('SELECT public_number FROM sales_orders WHERE id=?',(order_id,)).fetchone()[0] == number
