"""Create an explicitly separate, NEW demo catalogue with synthetic order snapshots.

Example (repository root):
services/api/.venv/Scripts/python.exe scripts/seed_sales_order_demo.py --demo \
    --catalog-path .local/orders.demo.sqlite3 --customer-id 00000000-0000-4000-8000-000000000001

The API must be explicitly configured to this demo catalogue. No credentials, sessions,
payment attempts, stock reservations, or live database values are read or generated.
"""
import argparse
import json
from pathlib import Path
import sys
from uuid import UUID, uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'services' / 'api'))
from app.inventory import CatalogStore, DEFAULT_CATALOG_PATH
from app.sales_orders import SalesOrderStore


def seed_demo(path: Path, customer_id: str, *, demo: bool = False):
    path = path.resolve()
    if not demo or not path.name.endswith('.demo.sqlite3') or path == DEFAULT_CATALOG_PATH.resolve():
        raise ValueError('Require --demo and a new separate *.demo.sqlite3 catalogue.')
    customer_id = str(UUID(customer_id))
    path.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation prevents overwriting even when another process races us.
    with path.open('xb'):
        pass
    catalog = CatalogStore(path)
    with catalog.transaction():
        pass
    store = SalesOrderStore(catalog)
    ids = []
    cases = [('confirmed', 'succeeded', 'preparing', 1),
             ('confirmed', 'succeeded', 'partially_shipped', 2),
             ('awaiting_payment', 'pending', 'unprepared', 1),
             ('closed', 'succeeded', 'delivered', 1),
             ('expired', 'failed', 'unprepared', 1),
             ('awaiting_payment', 'unknown', 'unprepared', 1)]
    with store.transaction() as db:
        for index, (status, payment, fulfillment, quantity) in enumerate(cases, 1):
            order_id = str(uuid4())
            ids.append(order_id)
            at = f'2026-11-01T00:00:{index:02d}Z'
            goods = 29000 * quantity
            shipping = 0 if goods >= 50000 else 3000
            db.execute('''INSERT INTO sales_orders(id,public_number,customer_id,created_at,status,payment_status,fulfillment_status,goods_total,shipping_total,grand_total,is_demo)
                VALUES(?,?,?,?,?,?,?,?,?,?,1)''', (order_id, f'DEMO-20261101-{index:04d}', customer_id, at, status, payment, fulfillment, goods, shipping, goods + shipping))
            db.execute('INSERT INTO sales_order_lines VALUES(?,?,?,?,?,?,?,?,?,?)', (str(uuid4()), order_id, 0, 'demo-sku-only', '합성 그래픽 티셔츠', '네이비', 'M', quantity, 29000, goods))
            db.execute('INSERT INTO sales_order_shipping VALUES(?,?,?,?,?,?,?)', (order_id, '합성 수령인', '01000000000', '00000', '합성시 테스트로 1', '테스트동 101호', '실제 배송하지 않는 합성 주문'))
            if fulfillment in ('partially_shipped', 'delivered'):
                shipment_status = 'delivered' if fulfillment == 'delivered' else 'shipped'
                db.execute('INSERT INTO sales_order_shipments VALUES(?,?,?,?,?,?)', (str(uuid4()), order_id, '합성 택배', f'DEMO-TRACK-{index}', shipment_status, 1))
            db.execute('INSERT INTO sales_order_events VALUES(?,?,?,?,?)', (str(uuid4()), order_id, 0, '합성 데이터 생성 · 실제 결제 없음', at))
    return {'catalog_path': str(path), 'orders': ids, 'is_demo': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--demo', action='store_true', help='Explicitly authorize synthetic data in a new demo file.')
    parser.add_argument('--catalog-path', required=True, type=Path)
    parser.add_argument('--customer-id', required=True, help='UUID of the isolated synthetic test customer.')
    args = parser.parse_args()
    try:
        result = seed_demo(args.catalog_path, args.customer_id, demo=args.demo)
    except (ValueError, FileExistsError) as exc:
        parser.error(str(exc))
    print(json.dumps(result))


if __name__ == '__main__':
    main()
