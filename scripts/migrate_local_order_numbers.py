"""One-time, explicitly requested local demo renumbering. Never run in production."""
import argparse
from contextlib import closing
from datetime import datetime
from pathlib import Path
import sqlite3
import sys
from uuid import UUID, uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'services/api'))
from app.order_numbers import allocate_order_number


def migrate(db, account):
    """Caller owns transaction; restrict both account and legacy demo prefix."""
    if not db.in_transaction:
        raise ValueError('Transaction required')
    prefix = 'LOCAL-DEMO-' + account[:8] + '-'
    rows = db.execute('SELECT id,created_at FROM sales_orders WHERE customer_id=? AND is_demo=1 AND public_number LIKE ?', (account, prefix+'%')).fetchall()
    results = []
    for order_id, created_at in rows:
        temporary_id = str(uuid4())
        number = allocate_order_number(db, temporary_id, now=datetime.fromisoformat(created_at.replace('Z', '+00:00')))
        db.execute('UPDATE sales_orders SET public_number=? WHERE id=? AND customer_id=? AND is_demo=1', (number, order_id, account))
        db.execute('UPDATE sales_order_number_allocations SET order_id=? WHERE order_id=?', (order_id, temporary_id))
        results.append(number)
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local-demo', action='store_true')
    parser.add_argument('--account-id-file', type=Path, required=True)
    args = parser.parse_args()
    if not args.local_demo:
        parser.error('--local-demo is required')
    account = str(UUID(args.account_id_file.read_text().strip()))
    target = ROOT / '.local/catalog.sqlite3'
    if not target.is_file():
        raise ValueError('Existing local DB required')
    backup = target.with_name('catalog.pre-demo-renumber-' + str(uuid4()) + '.bak')
    with closing(sqlite3.connect(target, isolation_level=None, timeout=10)) as db:
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('BEGIN IMMEDIATE')
        try:
            with closing(sqlite3.connect(target)) as source, closing(sqlite3.connect(backup)) as dest:
                source.backup(dest)
            numbers = migrate(db, account)
            db.commit()
        except Exception:
            db.rollback()
            raise
    print('Backup: ' + backup.name)
    print('Renumbered demo orders: ' + str(len(numbers)))
    for number in numbers:
        print(number)


if __name__ == '__main__':
    main()
