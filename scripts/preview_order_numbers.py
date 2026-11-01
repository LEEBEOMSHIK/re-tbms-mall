"""Preview real allocation logic in a disposable DB, never the configured DB.

Run with services/api/.venv/Scripts/python.exe scripts/preview_order_numbers.py
"""
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'services' / 'api'))
from app.inventory import CatalogStore
from app.sales_orders import SalesOrderStore


def main():
    with TemporaryDirectory(prefix='order-number-preview-') as directory:
        store = SalesOrderStore(CatalogStore(Path(directory) / 'preview.sqlite3'))
        numbers = []
        for _ in range(3):
            order_id = str(uuid4())
            with store.transaction() as db:
                number = store.allocate_number(db, order_id)
            with store.transaction() as db:
                assert store.allocate_number(db, order_id) == number
            numbers.append(number)
        print(json.dumps({'preview_only': True, 'numbers': numbers, 'retry_same_number': True}))


if __name__ == '__main__':
    main()
