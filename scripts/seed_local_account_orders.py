"""Explicit local-only synthetic orders for a signed-in account; no stock/payment writes."""
import argparse
from contextlib import closing
from pathlib import Path
import sqlite3
from uuid import UUID, uuid4
from seed_sales_order_demo import seed_demo

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local-demo', action='store_true')
    parser.add_argument('--account-id-file', type=Path, required=True)
    args = parser.parse_args()
    if not args.local_demo:
        parser.error('--local-demo is required')
    account = str(UUID(args.account_id_file.read_text().strip()))
    target = ROOT / '.local/catalog.sqlite3'
    with closing(sqlite3.connect(ROOT / '.local/customers.sqlite3')) as customers:
        if not customers.execute('SELECT 1 FROM customers WHERE id=?', (account,)).fetchone():
            raise ValueError('Existing local customer required')
    prefix = 'LOCAL-DEMO-' + account[:8] + '-'
    with closing(sqlite3.connect(target)) as db:
        count = db.execute('SELECT count(*) FROM sales_orders WHERE customer_id=? AND is_demo=1 ', (account,)).fetchone()[0]
        if count:
            print(f'Existing synthetic orders preserved: {count}')
            return
        backup = target.with_name('catalog.pre-local-orders-'+str(uuid4())+'.bak')
        with closing(sqlite3.connect(backup)) as dest:
            db.backup(dest)
        source = ROOT / '.local' / ('account-orders-'+str(uuid4())+'.demo.sqlite3')
        seed_demo(source, account, demo=True)
        db.execute('ATTACH DATABASE ? AS demo', (str(source),))
        with db:
            db.execute('INSERT INTO sales_orders SELECT id, ? || substr(public_number,-4), customer_id,created_at,status,payment_status,fulfillment_status,goods_total,shipping_total,grand_total,is_demo FROM demo.sales_orders', (prefix,))
            for table in ('sales_order_lines','sales_order_shipping','sales_order_shipments','sales_order_events'):
                db.execute(f'INSERT INTO {table} SELECT * FROM demo.{table}')
        print('Inserted 6 synthetic orders; catalog backup preserved. No stock or payment changes.')

if __name__ == '__main__':
    main()
