"""Explicit local-only synthetic factory workspace; never resets existing records."""
import argparse
import base64
from contextlib import contextmanager
from io import BytesIO
import json
import os
from pathlib import Path
import re
import secrets
import sys
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PIL import Image, ImageDraw
from app.factory import AccountCreate, FactoryStore, ProductSuppliers, ProductionCreate, password_matches
from app.inventory import CatalogStore, CategoryCreate, OptionValueCreate, ProductCreate, SkuCreate, SupplierCreate
from app.product_images import ProductImageCreate, ProductImageStore


class TransactionCatalog(CatalogStore):
    """Let existing domain methods share the seed's one atomic transaction."""
    def __init__(self, path, connection):
        super().__init__(path)
        self.connection = connection

    @contextmanager
    def transaction(self):
        yield self.connection


def credentials_at(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        value = {'username': 'factory.demo.' + uuid4().hex, 'password': secrets.token_urlsafe(32)}
        try:
            descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        else:
            with os.fdopen(descriptor, 'w', encoding='utf-8') as stream:
                json.dump(value, stream)
    value = json.loads(path.read_text(encoding='utf-8'))
    if (not isinstance(value, dict) or set(value) != {'username', 'password'}
            or not isinstance(value['username'], str)
            or not re.fullmatch(r'factory\.demo\.[0-9a-f]{32}', value['username'])
            or not isinstance(value['password'], str) or not 32 <= len(value['password']) <= 128):
        raise ValueError('The local demo credential file is invalid; it was not overwritten.')
    return value


def sample_image(name, color):
    image = Image.new('RGB', (480, 360), '#eef2f6')
    draw = ImageDraw.Draw(image)
    draw.polygon([(150, 90), (205, 60), (275, 60), (330, 90), (385, 145), (335, 185),
                  (310, 155), (310, 305), (170, 305), (170, 155), (145, 185), (95, 145)],
                 fill=color, outline='#18324b', width=3)
    draw.text((20, 20), 'SYNTHETIC DEMO / NOT FOR PRODUCTION', fill='#18324b')
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    return ProductImageCreate(id=str(uuid4()), kind='design', name=name, alt='로컬 테스트용 티셔츠 시안',
                              data_url='data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode())


def seed(catalog_path: Path, credentials_path: Path, *, local_demo: bool):
    if not local_demo:
        raise ValueError('Explicit --local-demo is required.')
    if catalog_path.resolve() == credentials_path.resolve():
        raise ValueError('Database and credential paths must differ.')
    credentials = credentials_at(credentials_path)
    suffix = credentials['username'].rsplit('.', 1)[1][:8]
    supplier_name = f'[테스트] 샘플 의류 공장 {suffix}'
    with CatalogStore(catalog_path).transaction() as db:
        existing = db.execute('SELECT * FROM factory_accounts WHERE username=?', (credentials['username'],)).fetchone()
        if existing:
            supplier = db.execute('SELECT name FROM suppliers WHERE id=?', (existing['supplier_id'],)).fetchone()
            if (not supplier or supplier['name'] != supplier_name or existing['display_name'] != '공장 테스트 관리자'
                    or not password_matches(credentials['password'], existing['password_hash'])):
                raise ValueError('Existing account does not match this demo; no records were changed.')
            # Preserve user testing: statuses, activation, assignments and passwords are never reset.
            return {'created': False, 'supplier_id': existing['supplier_id'], 'account_id': existing['id']}
        catalog = TransactionCatalog(catalog_path, db)
        factory = FactoryStore(catalog)
        supplier = catalog.create_supplier(SupplierCreate(name=supplier_name, is_active=True))
        account = factory.create_account(AccountCreate(supplier_id=supplier['id'], username=credentials['username'],
                                         password=credentials['password'], display_name='공장 테스트 관리자', is_active=True))
        # Dedicated classifications avoid modifying or depending on the user's active master data.
        code = 'D' + suffix.upper()
        parent = catalog.create_category(CategoryCreate(name=f'[테스트] 의류 {suffix}', code=code,
                                         parent_id=None, sort_order=9999, is_active=True))
        category = catalog.create_category(CategoryCreate(name='테스트 티셔츠', code='T' + suffix.upper(),
                                           parent_id=parent['id'], sort_order=0, is_active=True))
        product = catalog.create_product(ProductCreate(name='[테스트] 공장 협업 티셔츠', category_id=category['id'],
                                         seasons=['ALL'], description='공장 권한과 시안·제작 요청 흐름을 확인하는 합성 상품입니다.'))
        color = catalog.create_option_value(OptionValueCreate(kind='color', name=f'테스트 네이비 {suffix}', code=code,
                                            sort_order=9999, is_active=True))
        size = catalog.create_option_value(OptionValueCreate(kind='size', name=f'테스트 M {suffix}', code=code,
                                           sort_order=9999, is_active=True))
        sku = catalog.create_sku(SkuCreate(product_id=product['id'], color_id=color['id'], size_id=size['id'], reorder_point=0))
        images = ProductImageStore(catalog)
        shared = images.create(product['id'], sample_image('[테스트] 공유 시안', '#496b90'))
        images.create(product['id'], sample_image('[테스트] 내부 전용 시안', '#9b6a5d'))
        factory.assignments(product['id'], ProductSuppliers(supplier_ids=[supplier['id']], version=product['version'],
                            shared_images=[{'supplier_id': supplier['id'], 'image_ids': [shared['id']]}]))
        request = factory.create_request(ProductionCreate(id=str(uuid4()), product_id=product['id'], supplier_id=supplier['id'],
                                         lines=[{'sku_id': sku['id'], 'quantity': 10}],
                                         note='로컬 테스트용 제작 요청입니다. 실제 제작·입고 지시가 아닙니다.'))
        return {'created': True, 'supplier_id': supplier['id'], 'account_id': account['id'],
                'product_id': product['id'], 'request_id': request['id']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local-demo', action='store_true', required=True)
    parser.add_argument('--catalog-path', type=Path, required=True)
    parser.add_argument('--credentials-path', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = seed(args.catalog_path, args.credentials_path, local_demo=args.local_demo)
    except Exception:
        # Never include credential values or request payloads in terminal output.
        parser.exit(1, 'Demo setup failed. Existing records were not reset; check paths and local master data.\n')
    print('Local factory demo created.' if result['created'] else 'Local factory demo retained without resetting data.')


if __name__ == '__main__':
    main()
