"""Local draft catalogue and transactional stock ledger; never publishes products."""

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import re
from pathlib import Path
import sqlite3
from typing import Annotated, Literal
from uuid import UUID, uuid4

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.countries import COUNTRY_CODES
from app.factory import migrate_factory, migrate_factory_progress
from app.shipments import migrate_shipments
from app.public_catalog import migrate_publication, migrate_discount, PublicCatalog
from app.reviews import migrate_reviews
from app.product_details import ProductDetails

DEFAULT_CATALOG_PATH = Path(__file__).resolve().parents[3] / '.local' / 'catalog.sqlite3'
MAX_STOCK = 1_000_000


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, str_strip_whitespace=True)


class ProductCreate(Input):
    name: str = Field(min_length=1, max_length=120)
    category_id: str = Field(min_length=1, max_length=80)
    description: str = Field(default='', max_length=2000)
    seasons: list[str] = Field(max_length=4)
    details: ProductDetails = Field(default_factory=ProductDetails)

    @field_validator('seasons')
    @classmethod
    def canonical_seasons(cls, value: list[str]) -> list[str]:
        order = ['SP', 'SU', 'FA', 'WI', 'ALL']
        if len(set(value)) != len(value) or any(item not in order for item in value) or ('ALL' in value and len(value) != 1):
            raise ValueError('Select distinct seasons or ALL alone.')
        if len(value) == 4:
            return ['ALL']
        return [item for item in order if item in value]


class ProductUpdate(ProductCreate):
    version: int = Field(ge=0, le=2_147_483_647)


class ProductDelete(Input):
    version: int = Field(ge=0, le=2_147_483_647)


class CategoryUpdate(Input):
    name: str = Field(min_length=1, max_length=80)
    sort_order: int = Field(ge=0, le=10000)
    is_active: bool
    version: int = Field(ge=0, le=2_147_483_647)


class CategoryCreate(Input):
    name: str = Field(min_length=1, max_length=80)
    code: str = Field(pattern=r'^[A-Z0-9]{2,12}$')
    parent_id: str | None = Field(max_length=80)
    sort_order: int = Field(ge=0, le=10000)
    is_active: bool


class SkuCreate(Input):
    product_id: str = Field(min_length=1, max_length=64)
    color_id: str = Field(min_length=1, max_length=64)
    size_id: str = Field(min_length=1, max_length=64)
    reorder_point: int = Field(ge=0, le=MAX_STOCK)


class SkuReorderPointUpdate(Input):
    reorder_point: int = Field(ge=0, le=MAX_STOCK)
    version: int = Field(ge=0, le=2_147_483_647)


class SkuSettingsUpdate(SkuReorderPointUpdate):
    is_active: bool


class SkuBatchCreate(Input):
    product_id: str = Field(min_length=1, max_length=64)
    color_ids: list[Annotated[str, Field(min_length=1, max_length=64)]] = Field(min_length=1, max_length=50)
    size_ids: list[Annotated[str, Field(min_length=1, max_length=64)]] = Field(min_length=1, max_length=50)
    reorder_point: int = Field(ge=0, le=MAX_STOCK)

    @model_validator(mode='after')
    def bounded_unique_combinations(self):
        if len(set(self.color_ids)) != len(self.color_ids) or len(set(self.size_ids)) != len(self.size_ids):
            raise ValueError('Option IDs must be unique within each list.')
        if len(self.color_ids) * len(self.size_ids) > 200:
            raise ValueError('A batch supports at most 200 combinations.')
        return self


class SelectedSkuItem(Input):
    color_id: str = Field(min_length=1, max_length=64)
    size_id: str = Field(min_length=1, max_length=64)
    initial_stock: int = Field(ge=0, le=MAX_STOCK)
    reorder_point: int | None = Field(default=None, ge=0, le=MAX_STOCK)

    @field_validator('reorder_point', mode='before')
    @classmethod
    def reject_explicit_null(cls, value):
        if value is None:
            raise ValueError('Omit reorder_point to use the common value; null is not allowed.')
        return value


class SelectedSkuBatchCreate(Input):
    product_id: str = Field(min_length=1, max_length=64)
    items: list[SelectedSkuItem] = Field(min_length=1, max_length=200)
    reorder_point: int = Field(default=0, ge=0, le=MAX_STOCK)

    @model_validator(mode='after')
    def bounded_unique_items(self):
        pairs = {(item.color_id, item.size_id) for item in self.items}
        if len(pairs) != len(self.items):
            raise ValueError('Each option combination must appear once.')
        if len({item.color_id for item in self.items}) > 50 or len({item.size_id for item in self.items}) > 50:
            raise ValueError('A batch supports at most 50 colors and 50 sizes.')
        return self


class OptionValueCreate(Input):
    kind: Literal['color', 'size']
    name: str = Field(min_length=1, max_length=80)
    code: str = Field(pattern=r'^[A-Z0-9]{1,12}$')
    is_active: bool
    sort_order: int = Field(ge=0, le=10000)


class OptionValueUpdate(Input):
    name: str = Field(min_length=1, max_length=80)
    is_active: bool
    sort_order: int = Field(ge=0, le=10000)
    version: int = Field(ge=0, le=2_147_483_647)


class MovementCreate(Input):
    sku_id: str = Field(min_length=1, max_length=64)
    version: int = Field(ge=0, le=2_147_483_647)
    delta: int = Field(ge=-MAX_STOCK, le=MAX_STOCK)
    reason: str = Field(default='', max_length=300)
    request_id: str
    reason_code: Literal['receipt', 'sale', 'gift', 'disposal', 'other_out', 'adjust_in', 'adjust_out', 'legacy'] = 'legacy'
    supplier_id: str | None = Field(default=None, min_length=1, max_length=64)

    @model_validator(mode='after')
    def reason_direction(self):
        if self.supplier_id is not None and self.reason_code != 'receipt':
            raise ValueError('A supplier can only be recorded for receipt movements.')
        if self.reason_code in ('receipt', 'adjust_in') and self.delta < 0:
            raise ValueError('This reason requires a positive quantity.')
        if self.reason_code in ('sale', 'gift', 'disposal', 'other_out', 'adjust_out') and self.delta > 0:
            raise ValueError('This reason requires a negative quantity.')
        return self


    @field_validator('delta')
    @classmethod
    def nonzero(cls, value: int) -> int:
        if value == 0:
            raise ValueError('delta must be nonzero')
        return value

    @field_validator('request_id')
    @classmethod
    def uuid_request(cls, value: str) -> str:
        return str(UUID(value))


class SupplierCreate(Input):
    name: str = Field(min_length=1, max_length=120)
    is_active: bool
    english_name: str = Field(default='', max_length=120)
    representative_name: str = Field(default='', max_length=80)
    phone: str = Field(default='', max_length=40)
    business_number: str = Field(default='', max_length=40)
    contact_name: str = Field(default='', max_length=80)
    contact_phone: str = Field(default='', max_length=40)
    email: str = Field(default='', max_length=254)
    postal_code: str = Field(default='', max_length=20)
    address: str = Field(default='', max_length=240)
    address_detail: str = Field(default='', max_length=240)
    memo: str = Field(default='', max_length=1000)
    country_code: str = Field(default='', max_length=2)
    region: str = Field(default='', max_length=120)
    city: str = Field(default='', max_length=120)

    @field_validator('country_code')
    @classmethod
    def assigned_country(cls, value: str) -> str:
        if value and value not in COUNTRY_CODES:
            raise ValueError('Choose an assigned uppercase ISO country code or leave it empty.')
        return value

    @field_validator('email')
    @classmethod
    def basic_email(cls, value: str) -> str:
        if value and re.fullmatch(r'[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+', value) is None:
            raise ValueError('Enter a valid email address or leave it empty.')
        return value

    @field_validator('phone', 'contact_phone')
    @classmethod
    def international_phone(cls, value: str) -> str:
        if not value:
            return value
        if re.fullmatch(r'\+?[0-9() .-]+', value) is None:
            raise ValueError('Use digits and separators, with at most one leading + for international numbers.')
        digits = sum('0' <= char <= '9' for char in value)
        limit = 15 if value.startswith('+') else 11
        if not 1 <= digits <= limit:
            raise ValueError(f'Enter between 1 and {limit} digits; use a leading + for international numbers.')
        return value


class SupplierUpdate(SupplierCreate):
    version: int = Field(ge=0, le=2_147_483_647)


SUPPLIER_DETAILS = ('english_name', 'representative_name', 'phone', 'business_number', 'contact_name',
                    'contact_phone', 'email', 'postal_code', 'address', 'address_detail', 'memo')
SUPPLIER_ADDRESS_FIELDS = ('country_code', 'region', 'city')
SUPPLIER_ALL_DETAILS = SUPPLIER_DETAILS + SUPPLIER_ADDRESS_FIELDS
SUPPLIER_COLUMNS = 'id,name,is_active,version,' + ','.join(SUPPLIER_ALL_DETAILS)


PRODUCT_COLUMNS = 'id,name,category,description,version,internal_name,category_id,seasons,details'
SKU_COLUMNS = 'id,product_id,code,color,size,reorder_point,on_hand,version,color_id,size_id,is_active'
OPTION_COLUMNS = 'id,kind,name,code,is_active,sort_order,version'
MOVEMENT_COLUMNS = 'id,sku_id,delta,reason,actor,created_at,balance_after,request_id,reason_code,supplier_id,supplier_name'
SCHEMA = [
    '''CREATE TABLE products (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
        description TEXT NOT NULL, version INTEGER NOT NULL CHECK(version>=0))''',
    '''CREATE TABLE skus (
        id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id),
        code TEXT NOT NULL, code_key TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL, color_key TEXT NOT NULL, size TEXT NOT NULL, size_key TEXT NOT NULL,
        reorder_point INTEGER NOT NULL CHECK(reorder_point BETWEEN 0 AND 1000000),
        on_hand INTEGER NOT NULL CHECK(on_hand BETWEEN 0 AND 1000000),
        version INTEGER NOT NULL CHECK(version>=0),
        UNIQUE(product_id,color_key,size_key))''',
    '''CREATE TABLE movements (
        id TEXT PRIMARY KEY, sku_id TEXT NOT NULL REFERENCES skus(id),
        delta INTEGER NOT NULL CHECK(delta<>0), reason TEXT NOT NULL, actor TEXT NOT NULL,
        created_at TEXT NOT NULL, balance_after INTEGER NOT NULL CHECK(balance_after BETWEEN 0 AND 1000000),
        request_id TEXT NOT NULL UNIQUE, request_payload TEXT NOT NULL)''',
]

# Starter taxonomy for local drafts, not a final business taxonomy.
STARTER_CATEGORIES = [
    ('tops', '상의', 'TOP'), ('outer', '아우터', 'OUT'),
    ('bottoms', '하의', 'BTM'), ('dresses', '원피스', 'DRS'), ('other', '기타', 'ETC'),
]
SEASON_OPTIONS = [{'code': code, 'label': label} for code, label in [('SP', '봄'), ('SU', '여름'), ('FA', '가을'), ('WI', '겨울'), ('ALL', '사계절')]]
STARTER_LEAVES = {
    'tops': [('tee', '티셔츠', 'TEE'), ('sweat', '맨투맨', 'SWT'), ('hood', '후드', 'HOD'), ('shirt', '셔츠', 'SHT'), ('knit', '니트', 'KNT')],
    'bottoms': [('denim', '데님', 'DNM'), ('slacks', '슬랙스', 'SLK'), ('cotton', '면바지', 'COT'), ('shorts', '반바지', 'SHR')],
    'outer': [('jacket', '재킷', 'JKT'), ('coat', '코트', 'CT'), ('padded', '패딩', 'PAD'), ('cardigan', '카디건', 'CDG')],
    'dresses': [('general', '일반 원피스', 'DR')], 'other': [('general', '일반 기타', 'ET')],
}


def migrate_v2_to_v3(db: sqlite3.Connection) -> None:
    db.execute('ALTER TABLE categories ADD COLUMN parent_id TEXT REFERENCES categories(id)')
    db.execute('ALTER TABLE categories ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))')
    db.execute('ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order BETWEEN 0 AND 10000)')
    db.execute('ALTER TABLE categories ADD COLUMN version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0)')
    db.execute("ALTER TABLE products ADD COLUMN seasons TEXT NOT NULL DEFAULT '[]'")
    db.execute('''CREATE TABLE product_name_sequences (
        category_id TEXT NOT NULL REFERENCES categories(id), season_code TEXT NOT NULL,
        last_value INTEGER NOT NULL CHECK(last_value>=0), PRIMARY KEY(category_id,season_code))''')
    for parent, leaves in STARTER_LEAVES.items():
        if db.execute('SELECT id FROM categories WHERE id=?', (parent,)).fetchone() is None:
            continue
        for order, (slug, name, base_code) in enumerate(leaves):
            category_id = f'{parent}-{slug}'
            suffix = 0
            while db.execute('SELECT id FROM categories WHERE id=?', (category_id,)).fetchone():
                suffix += 1
                category_id = f'{parent}-{slug}-{suffix}'
            code, suffix = base_code, 0
            while db.execute('SELECT id FROM categories WHERE code=?', (code,)).fetchone():
                suffix += 1
                code = f'{base_code}{suffix}'
            db.execute('INSERT INTO categories(id,name,code,parent_id,sort_order) VALUES(?,?,?,?,?)', (category_id, name, code, parent, order))
    db.execute('PRAGMA user_version=3')


def product_response(row) -> dict:
    return {**dict(row), 'seasons': json.loads(row['seasons']),
            'details': ProductDetails.model_validate_json(row['details']).model_dump()}


def category_response(row) -> dict:
    return {**dict(row), 'is_active': bool(row['is_active'])}


def migrate_v3_to_v4(db: sqlite3.Connection) -> None:
    db.execute('''CREATE TABLE option_values (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('color','size')),
        name TEXT NOT NULL, name_key TEXT NOT NULL, code TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
        sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order BETWEEN 0 AND 10000),
        version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),
        UNIQUE(kind,name_key), UNIQUE(kind,code))''')
    db.execute('ALTER TABLE skus ADD COLUMN color_id TEXT REFERENCES option_values(id)')
    db.execute('ALTER TABLE skus ADD COLUMN size_id TEXT REFERENCES option_values(id)')
    values = {}
    counters = {'color': 0, 'size': 0}
    for sku in db.execute('SELECT id,color,size FROM skus ORDER BY rowid').fetchall():
        ids = {}
        for kind, prefix in [('color', 'C'), ('size', 'S')]:
            key = (kind, sku[kind].strip().casefold())
            if key not in values:
                counters[kind] += 1
                value_id = str(uuid4())
                db.execute('INSERT INTO option_values(id,kind,name,name_key,code) VALUES(?,?,?,?,?)',
                           (value_id, kind, sku[kind], key[1], f'{prefix}{counters[kind]:06d}'))
                values[key] = value_id
            ids[kind] = values[key]
        # Private comparison keys switch from old snapshots to domain identity.
        db.execute('UPDATE skus SET color_id=?,size_id=?,color_key=?,size_key=? WHERE id=?',
                   (ids['color'], ids['size'], ids['color'], ids['size'], sku['id']))
    db.execute('CREATE UNIQUE INDEX skus_option_identity ON skus(product_id,color_id,size_id)')
    db.execute('PRAGMA user_version=4')


def allocate_internal_name(db: sqlite3.Connection, category: sqlite3.Row) -> str:
    """Caller holds BEGIN IMMEDIATE; the durable counter is not based on row count."""
    db.execute('UPDATE category_sequences SET last_value=last_value+1 WHERE category_id=?', (category['id'],))
    number = db.execute('SELECT last_value FROM category_sequences WHERE category_id=?', (category['id'],)).fetchone()[0]
    return f"{category['code']}-{number:06d}"


def migrate_v1_to_v2(db: sqlite3.Connection) -> None:
    """Add naming metadata without replacing products, SKUs, or the stock ledger."""
    db.execute('CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL UNIQUE)')
    db.execute('''CREATE TABLE category_sequences (
        category_id TEXT PRIMARY KEY REFERENCES categories(id),
        last_value INTEGER NOT NULL CHECK(last_value>=0))''')
    db.executemany('INSERT INTO categories(id,name,code) VALUES(?,?,?)', STARTER_CATEGORIES)
    db.executemany('INSERT INTO category_sequences VALUES(?,0)', [(item[0],) for item in STARTER_CATEGORIES])
    db.execute('ALTER TABLE products ADD COLUMN category_id TEXT REFERENCES categories(id)')
    db.execute('ALTER TABLE products ADD COLUMN internal_name TEXT')
    # v1 category was free text: even an English ID-looking label must be preserved.
    known = {name: category_id for category_id, name, _ in STARTER_CATEGORIES}
    legacy = {}
    # v1 has no created_at. Its preserved rowid order is the only registration order available.
    for product in db.execute('SELECT id,category FROM products ORDER BY rowid').fetchall():
        label = product['category']
        category_id = known.get(label)
        if category_id is None:
            if label not in legacy:
                number = len(legacy) + 1
                category_id = f'legacy-{number:03d}'
                db.execute('INSERT INTO categories VALUES(?,?,?)', (category_id, label, f'LEG{number:03d}'))
                db.execute('INSERT INTO category_sequences VALUES(?,0)', (category_id,))
                legacy[label] = category_id
            category_id = legacy[label]
        category = db.execute('SELECT * FROM categories WHERE id=?', (category_id,)).fetchone()
        internal_name = allocate_internal_name(db, category)
        db.execute('UPDATE products SET category_id=?,category=?,internal_name=? WHERE id=?',
                   (category_id, category['name'], internal_name, product['id']))
    db.execute('CREATE UNIQUE INDEX products_internal_name ON products(internal_name)')
    db.execute('PRAGMA user_version=2')


class CatalogStore:
    def __init__(self, path: Path = DEFAULT_CATALOG_PATH):
        self.path = path

    @contextmanager
    def transaction(self):
        connection = None
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            connection = sqlite3.connect(self.path, timeout=5, isolation_level=None)
            connection.row_factory = sqlite3.Row
            connection.execute('PRAGMA foreign_keys=ON')
            connection.execute('PRAGMA busy_timeout=5000')
            # A v12 file is backed up before additive shipment migration; never overwrite a backup.
            if connection.execute('PRAGMA user_version').fetchone()[0] == 12:
                backup_path = self.path.with_name(self.path.name + '.pre-v13-' + str(uuid4()) + '.bak')
                with sqlite3.connect(backup_path) as backup:
                    connection.backup(backup)
            if connection.execute('PRAGMA user_version').fetchone()[0] == 13:
                backup_path = self.path.with_name(self.path.name + '.pre-v14-' + str(uuid4()) + '.bak')
                with sqlite3.connect(backup_path) as backup:
                    connection.backup(backup)
            if connection.execute('PRAGMA user_version').fetchone()[0] == 14:
                backup_path = self.path.with_name(self.path.name + '.pre-v15-' + str(uuid4()) + '.bak')
                with sqlite3.connect(backup_path) as backup:
                    connection.backup(backup)
            if connection.execute('PRAGMA user_version').fetchone()[0] == 15:
                backup_path = self.path.with_name(self.path.name + '.pre-v16-' + str(uuid4()) + '.bak')
                with sqlite3.connect(backup_path) as backup:
                    connection.backup(backup)
            if connection.execute('PRAGMA user_version').fetchone()[0] == 16:
                backup_path = self.path.with_name(self.path.name + '.pre-v17-' + str(uuid4()) + '.bak')
                with sqlite3.connect(backup_path) as backup:
                    connection.backup(backup)
            connection.execute('BEGIN IMMEDIATE')
            version = connection.execute('PRAGMA user_version').fetchone()[0]
            if version == 0:
                tables = connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()
                if tables:
                    raise HTTPException(503, 'Unversioned catalogue storage requires review.')
                for statement in SCHEMA:
                    connection.execute(statement)
                connection.execute('PRAGMA user_version=1')
                version = 1
            if version == 1:
                migrate_v1_to_v2(connection)
                version = 2
            if version == 2:
                migrate_v2_to_v3(connection)
                version = 3
            if version == 3:
                migrate_v3_to_v4(connection)
                version = 4
            if version == 4:
                connection.execute("""ALTER TABLE movements ADD COLUMN reason_code TEXT NOT NULL DEFAULT 'legacy'
                    CHECK(reason_code IN ('receipt','sale','gift','disposal','other_out','adjust_in','adjust_out','legacy'))""")
                connection.execute('PRAGMA user_version=5')
                version = 5
            if version == 5:
                connection.execute('''CREATE TABLE suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL,
                    name_key TEXT NOT NULL UNIQUE, is_active INTEGER NOT NULL CHECK(is_active IN (0,1)),
                    version INTEGER NOT NULL CHECK(version>=0))''')
                connection.execute('ALTER TABLE movements ADD COLUMN supplier_id TEXT REFERENCES suppliers(id)')
                connection.execute('ALTER TABLE movements ADD COLUMN supplier_name TEXT')
                connection.execute('PRAGMA user_version=6')
                version = 6
            if version == 6:
                for column in SUPPLIER_DETAILS:
                    connection.execute(f"ALTER TABLE suppliers ADD COLUMN {column} TEXT NOT NULL DEFAULT ''")
                connection.execute('PRAGMA user_version=7')
                version = 7
            if version == 7:
                for column in SUPPLIER_ADDRESS_FIELDS:
                    connection.execute(f"ALTER TABLE suppliers ADD COLUMN {column} TEXT NOT NULL DEFAULT ''")
                connection.execute('PRAGMA user_version=8')
                version = 8
            if version == 8:
                connection.execute('''CREATE TABLE product_images (
                    id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                    kind TEXT NOT NULL CHECK(kind IN ('design','model','garment')), name TEXT NOT NULL,
                    alt TEXT NOT NULL, data_url TEXT NOT NULL, request_hash TEXT NOT NULL)''')
                connection.execute('CREATE INDEX product_images_product_kind ON product_images(product_id,kind)')
                connection.execute('PRAGMA user_version=9')
                version = 9
            if version == 9:
                migrate_factory(connection)
                version = 10
            if version == 10:
                migrate_factory_progress(connection)
                version = 11
            if version == 11:
                connection.execute('ALTER TABLE skus ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))')
                connection.execute('PRAGMA user_version=12')
                version = 12
            if version == 12:
                migrate_shipments(connection)
                version = 13
            if version == 13:
                migrate_publication(connection)
                version = 14
            if version == 14:
                migrate_reviews(connection)
                version = 15
            if version == 15:
                migrate_discount(connection)
                version = 16
            if version == 16:
                connection.execute("ALTER TABLE products ADD COLUMN details TEXT NOT NULL DEFAULT '{}'")
                connection.execute('PRAGMA user_version=17')
                version = 17
            if version != 17:
                raise HTTPException(503, 'Unsupported catalogue storage version.')
            yield connection
            connection.commit()
        except (sqlite3.Error, OSError):
            raise HTTPException(503, 'Local catalogue storage is unavailable.') from None
        finally:
            if connection is not None:
                if connection.in_transaction:
                    connection.rollback()
                connection.close()

    def get(self) -> dict:
        with self.transaction() as db:
            readiness = []
            for aggregate in db.execute('''SELECT p.id AS product_id, COUNT(s.id) AS sku_count,
                    COALESCE(SUM(CASE WHEN s.on_hand>0 THEN 1 ELSE 0 END),0) AS stocked_sku_count,
                    COALESCE(SUM(s.on_hand),0) AS total_on_hand
                FROM products p LEFT JOIN skus s ON s.product_id=p.id
                GROUP BY p.id ORDER BY p.rowid'''):
                row = dict(aggregate)
                if row['sku_count'] == 0:
                    status = 'no_options'
                elif row['stocked_sku_count'] == 0:
                    status = 'no_stock'
                elif row['stocked_sku_count'] < row['sku_count']:
                    status = 'partial_stock'
                else:
                    status = 'in_stock'
                readiness.append({**row, 'status': status})
            return {
                'mode': 'local',
                'suppliers': [category_response(row) for row in db.execute(f'SELECT {SUPPLIER_COLUMNS} FROM suppliers ORDER BY rowid')],
                'product_readiness': readiness,
                'option_values': [category_response(row) for row in db.execute(f'SELECT {OPTION_COLUMNS} FROM option_values ORDER BY sort_order,rowid')],
                'season_options': SEASON_OPTIONS,
                'country_codes': COUNTRY_CODES,
                'categories': [category_response(row) for row in db.execute('SELECT * FROM categories ORDER BY sort_order,rowid')],
                'products': [self.product_with_publication(db, row) for row in db.execute(f'SELECT {PRODUCT_COLUMNS} FROM products ORDER BY rowid')],
                'skus': [category_response(row) for row in db.execute(f'SELECT {SKU_COLUMNS} FROM skus ORDER BY rowid')],
                'movements': [dict(row) for row in db.execute(f'SELECT {MOVEMENT_COLUMNS} FROM movements ORDER BY rowid DESC')],
            }

    @staticmethod
    def product_with_publication(db, row):
        result = product_response(row)
        state = PublicCatalog.admin_state(db, row['id'])
        return {**result, 'publication_status':state['status'], 'publication_visible':state['public_visible'], 'publication_can_publish':state['can_publish'], 'publication_reasons':state['reasons']}

    def overview(self) -> dict:
        """One consistent stock snapshot; inactive options still hold physical stock."""
        with self.transaction() as db:
            totals = dict(db.execute('''SELECT COUNT(*) AS option_count,
                COALESCE(SUM(on_hand),0) AS total_on_hand,
                COALESCE(SUM(CASE WHEN on_hand<=reorder_point THEN 1 ELSE 0 END),0) AS low_stock_count
                FROM skus''').fetchone())
            preview = [dict(row) for row in db.execute('''SELECT s.id,s.product_id,s.code,s.color,s.size,
                s.on_hand,s.reorder_point,s.is_active,p.name AS product_name,p.internal_name
                FROM skus s JOIN products p ON p.id=s.product_id
                WHERE s.on_hand<=s.reorder_point ORDER BY s.on_hand,s.rowid LIMIT 5''')]
            for row in preview:
                row['is_active'] = bool(row['is_active'])
            return {'mode': 'local', 'as_of': datetime.now(timezone.utc).isoformat(),
                    **totals, 'low_stock_preview': preview}

    def create_product(self, body: ProductCreate) -> dict:
        row = {'id': str(uuid4()), **body.model_dump(), 'version': 0}
        with self.transaction() as db:
            category, parent = self.require_classification(db, body.category_id, body.seasons)
            season_code = ''.join(body.seasons)
            db.execute('INSERT OR IGNORE INTO product_name_sequences VALUES(?,?,0)', (body.category_id, season_code))
            db.execute('UPDATE product_name_sequences SET last_value=last_value+1 WHERE category_id=? AND season_code=?', (body.category_id, season_code))
            number = db.execute('SELECT last_value FROM product_name_sequences WHERE category_id=? AND season_code=?', (body.category_id, season_code)).fetchone()[0]
            row.update(category=category['name'], internal_name=f"{parent['code']}-{category['code']}-{season_code}-{number:06d}")
            db.execute('''INSERT INTO products(id,name,category,description,version,category_id,internal_name,seasons,details)
                VALUES(:id,:name,:category,:description,:version,:category_id,:internal_name,:seasons,:details)''',
                {**row, 'seasons': json.dumps(body.seasons), 'details': json.dumps(row['details'])})
        return row

    @staticmethod
    def require_category(db: sqlite3.Connection, category_id: str) -> sqlite3.Row:
        category = db.execute('SELECT * FROM categories WHERE id=?', (category_id,)).fetchone()
        if category is None:
            raise HTTPException(422, 'Choose an existing product category.')
        return category

    @classmethod
    def require_classification(cls, db, category_id, seasons):
        category = cls.require_category(db, category_id)
        parent = db.execute('SELECT * FROM categories WHERE id=?', (category['parent_id'],)).fetchone()
        if not seasons or not category['is_active'] or parent is None or not parent['is_active'] or parent['parent_id'] is not None:
            raise HTTPException(422, 'Choose an active subcategory and at least one season.')
        return category, parent

    @staticmethod
    def check_category_name(db, name, parent_id, exclude_id=''):
        rows = db.execute('SELECT id,name FROM categories WHERE parent_id IS ?', (parent_id,)).fetchall()
        if any(row['id'] != exclude_id and row['name'].casefold() == name.casefold() for row in rows):
            raise HTTPException(409, 'A category with this name already exists under the same parent.')

    def create_category(self, body: CategoryCreate) -> dict:
        with self.transaction() as db:
            if body.parent_id is not None:
                parent = self.require_category(db, body.parent_id)
                if parent['parent_id'] is not None:
                    raise HTTPException(422, 'Categories support only two levels.')
            self.check_category_name(db, body.name, body.parent_id)
            if db.execute('SELECT id FROM categories WHERE code=?', (body.code,)).fetchone():
                raise HTTPException(409, 'Category code already exists.')
            row = {'id': str(uuid4()), **body.model_dump(), 'version': 0}
            db.execute('''INSERT INTO categories(id,name,code,parent_id,sort_order,is_active,version)
                VALUES(:id,:name,:code,:parent_id,:sort_order,:is_active,:version)''', row)
        return row

    def update_category(self, category_id: str, body: CategoryUpdate) -> dict:
        with self.transaction() as db:
            current = db.execute('SELECT * FROM categories WHERE id=?', (category_id,)).fetchone()
            if current is None:
                raise HTTPException(404, 'Category not found.')
            if current['version'] != body.version:
                raise HTTPException(409, 'Category changed. Reload before saving.')
            self.check_category_name(db, body.name, current['parent_id'], category_id)
            row = {**dict(current), **body.model_dump(), 'version': body.version + 1}
            db.execute('UPDATE categories SET name=:name,sort_order=:sort_order,is_active=:is_active,version=:version WHERE id=:id', row)
            db.execute('UPDATE products SET category=? WHERE category_id=?', (body.name, category_id))
        return row

    def update_product(self, product_id: str, body: ProductUpdate) -> dict:
        with self.transaction() as db:
            current = db.execute('SELECT version,internal_name,category_id,seasons,details FROM products WHERE id=?', (product_id,)).fetchone()
            if current is None:
                raise HTTPException(404, 'Product not found.')
            if current['version'] != body.version:
                raise HTTPException(409, 'Product changed. Reload before saving.')
            category = self.require_category(db, body.category_id)
            if current['category_id'] != body.category_id or json.loads(current['seasons']) != body.seasons:
                self.require_classification(db, body.category_id, body.seasons)
            row = {'id': product_id, **body.model_dump(), 'version': body.version + 1,
                   'category': category['name'], 'internal_name': current['internal_name']}
            if 'details' not in body.model_fields_set:
                row['details'] = ProductDetails.model_validate_json(current['details']).model_dump()
            db.execute('''UPDATE products SET name=:name,category=:category,category_id=:category_id,
                description=:description,version=:version,seasons=:seasons,details=:details WHERE id=:id''',
                {**row, 'seasons': json.dumps(body.seasons), 'details': json.dumps(row['details'])})
        return row

    def delete_product(self, product_id: str, body: ProductDelete) -> dict:
        # The same write transaction serializes deletion against edits and SKU creation.
        with self.transaction() as db:
            current = db.execute('SELECT version FROM products WHERE id=?', (product_id,)).fetchone()
            if current is None:
                raise HTTPException(404, 'Product not found.')
            if current['version'] != body.version:
                raise HTTPException(409, 'Product changed. Reload before deleting.')
            if db.execute('SELECT 1 FROM skus WHERE product_id=? LIMIT 1', (product_id,)).fetchone():
                raise HTTPException(409, 'Products with registered color/size options cannot be deleted.')
            if db.execute('SELECT 1 FROM production_requests WHERE product_id=? LIMIT 1', (product_id,)).fetchone():
                raise HTTPException(409, 'Products with production history cannot be deleted.')
            db.execute('DELETE FROM products WHERE id=?', (product_id,))
        return {'id': product_id, 'deleted': True}

    def create_option_value(self, body: OptionValueCreate) -> dict:
        row = {'id': str(uuid4()), **body.model_dump(), 'version': 0}
        with self.transaction() as db:
            try:
                db.execute('''INSERT INTO option_values(id,kind,name,name_key,code,is_active,sort_order,version)
                    VALUES(:id,:kind,:name,:name_key,:code,:is_active,:sort_order,:version)''', {**row, 'name_key': body.name.casefold()})
            except sqlite3.IntegrityError:
                raise HTTPException(409, 'Option name or code already exists for this kind.') from None
        return row

    def update_option_value(self, value_id: str, body: OptionValueUpdate) -> dict:
        with self.transaction() as db:
            current = db.execute(f'SELECT {OPTION_COLUMNS} FROM option_values WHERE id=?', (value_id,)).fetchone()
            if current is None:
                raise HTTPException(404, 'Option value not found.')
            if current['version'] != body.version:
                raise HTTPException(409, 'Option value changed. Reload before saving.')
            row = {**dict(current), **body.model_dump(), 'version': body.version + 1}
            try:
                db.execute('''UPDATE option_values SET name=:name,name_key=:name_key,is_active=:is_active,
                    sort_order=:sort_order,version=:version WHERE id=:id''', {**row, 'name_key': body.name.casefold()})
            except sqlite3.IntegrityError:
                raise HTTPException(409, 'Option name already exists for this kind.') from None
        return row

    def update_reorder_point(self, sku_id: str, body: SkuReorderPointUpdate) -> dict:
        # Use the SKU version shared with stock changes to reject stale edits.
        with self.transaction() as db:
            current = db.execute(f'SELECT {SKU_COLUMNS} FROM skus WHERE id=?', (sku_id,)).fetchone()
            if current is None:
                raise HTTPException(404, 'SKU not found.')
            if current['version'] != body.version:
                raise HTTPException(409, 'SKU changed. Reload before changing the stock threshold.')
            db.execute('UPDATE skus SET reorder_point=?,version=version+1 WHERE id=?', (body.reorder_point, sku_id))
            return category_response(db.execute(f'SELECT {SKU_COLUMNS} FROM skus WHERE id=?', (sku_id,)).fetchone())

    def update_sku_settings(self, sku_id: str, body: SkuSettingsUpdate) -> dict:
        with self.transaction() as db:
            current = db.execute('SELECT version FROM skus WHERE id=?', (sku_id,)).fetchone()
            if current is None:
                raise HTTPException(404, 'SKU not found.')
            if current['version'] != body.version:
                raise HTTPException(409, 'SKU changed. Reload before changing option settings.')
            db.execute('UPDATE skus SET is_active=?,reorder_point=?,version=version+1 WHERE id=?', (body.is_active, body.reorder_point, sku_id))
            return category_response(db.execute(f'SELECT {SKU_COLUMNS} FROM skus WHERE id=?', (sku_id,)).fetchone())

    def create_sku(self, body: SkuCreate) -> dict:
        with self.transaction() as db:
            product, values = self.require_sku_values(db, body.product_id, [body.color_id], [body.size_id])
            row = self.insert_sku(db, body, product, values)
        return row

    @staticmethod
    def require_sku_values(db, product_id, color_ids, size_ids):
        product = db.execute('SELECT internal_name FROM products WHERE id=?', (product_id,)).fetchone()
        if product is None:
            raise HTTPException(404, 'Product not found.')
        values = {}
        for kind, ids in [('color', color_ids), ('size', size_ids)]:
            for value_id in ids:
                value = db.execute('SELECT * FROM option_values WHERE id=?', (value_id,)).fetchone()
                if value is None:
                    raise HTTPException(404, 'Option value not found.')
                if value['kind'] != kind or not value['is_active']:
                    raise HTTPException(422, 'Choose an active option of the correct kind.')
                values[value_id] = value
        return product, values

    @staticmethod
    def insert_sku(db, body, product, values):
        color, size = values[body.color_id], values[body.size_id]
        row = {'id': str(uuid4()), **body.model_dump(), 'on_hand': 0, 'version': 0, 'is_active': True,
               'code': f"{product['internal_name']}-{color['code']}-{size['code']}",
               'color': color['name'], 'size': size['name']}
        try:
            db.execute('''INSERT INTO skus(id,product_id,code,color,size,reorder_point,on_hand,version,code_key,color_key,size_key,color_id,size_id)
                VALUES(:id,:product_id,:code,:color,:size,:reorder_point,:on_hand,:version,:code_key,:color_key,:size_key,:color_id,:size_id)''',
                {**row, 'code_key': row['code'].casefold(), 'color_key': body.color_id, 'size_key': body.size_id})
        except sqlite3.IntegrityError:
            raise HTTPException(409, 'SKU code or product option combination already exists.') from None
        return row

    def create_sku_batch(self, body: SkuBatchCreate) -> dict:
        result = {'created': [], 'existing': []}
        with self.transaction() as db:
            # Validate every reference before inserting any combination, including existing ones.
            product, values = self.require_sku_values(db, body.product_id, body.color_ids, body.size_ids)
            for color_id in body.color_ids:
                for size_id in body.size_ids:
                    existing = db.execute(f'SELECT {SKU_COLUMNS} FROM skus WHERE product_id=? AND color_id=? AND size_id=?',
                                          (body.product_id, color_id, size_id)).fetchone()
                    if existing is not None:
                        result['existing'].append(category_response(existing))
                    else:
                        item = SkuCreate(product_id=body.product_id, color_id=color_id, size_id=size_id, reorder_point=body.reorder_point)
                        result['created'].append(self.insert_sku(db, item, product, values))
        return result

    def create_selected_sku_batch(self, body: SelectedSkuBatchCreate) -> dict:
        result = {'created': [], 'existing': []}
        with self.transaction() as db:
            product, values = self.require_sku_values(db, body.product_id,
                list(dict.fromkeys(item.color_id for item in body.items)),
                list(dict.fromkeys(item.size_id for item in body.items)))
            for item in body.items:
                existing = db.execute(f'SELECT {SKU_COLUMNS} FROM skus WHERE product_id=? AND color_id=? AND size_id=?',
                                      (body.product_id, item.color_id, item.size_id)).fetchone()
                if existing is not None:
                    result['existing'].append(category_response(existing))
                    continue
                sku = self.insert_sku(db, SkuCreate(product_id=body.product_id, color_id=item.color_id,
                    size_id=item.size_id, reorder_point=item.reorder_point if item.reorder_point is not None else body.reorder_point), product, values)
                if item.initial_stock > 0:
                    movement = MovementCreate(sku_id=sku['id'], version=0, delta=item.initial_stock,
                        reason='옵션 등록 시 초기 입고', reason_code='receipt', request_id=str(uuid4()))
                    self.apply_movement(db, movement)
                    sku.update(on_hand=item.initial_stock, version=1)
                result['created'].append(sku)
        return result

    def create_supplier(self, body: SupplierCreate) -> dict:
        row = {'id': str(uuid4()), **body.model_dump(), 'version': 0}
        with self.transaction() as db:
            try:
                db.execute(f'INSERT INTO suppliers({SUPPLIER_COLUMNS},name_key) VALUES({",".join(":" + column for column in SUPPLIER_COLUMNS.split(","))},:name_key)',
                           {**row, 'name_key': body.name.casefold()})
            except sqlite3.IntegrityError:
                raise HTTPException(409, 'Supplier name already exists.') from None
        return row

    def update_supplier(self, supplier_id: str, body: SupplierUpdate) -> dict:
        with self.transaction() as db:
            current = db.execute(f'SELECT {SUPPLIER_COLUMNS} FROM suppliers WHERE id=?', (supplier_id,)).fetchone()
            if current is None:
                raise HTTPException(404, 'Supplier not found.')
            if current['version'] != body.version:
                raise HTTPException(409, 'Supplier changed. Reload before saving.')
            row = {**dict(current), **body.model_dump(include=body.model_fields_set), 'version': body.version + 1}
            try:
                db.execute('UPDATE suppliers SET name=:name,name_key=:name_key,is_active=:is_active,version=:version,' +
                           ','.join(f'{column}=:{column}' for column in SUPPLIER_ALL_DETAILS) + ' WHERE id=:id',
                           {**row, 'name_key': body.name.casefold()})
            except sqlite3.IntegrityError:
                raise HTTPException(409, 'Supplier name already exists.') from None
        return row

    def move(self, body: MovementCreate) -> dict:
        with self.transaction() as db:
            return self.apply_movement(db, body)

    @staticmethod
    def apply_movement(db, body: MovementCreate, *, supplier_snapshot: str | None = None) -> dict:
        payload_fields = body.model_dump()
        if body.reason_code == 'legacy':
            payload_fields.pop('reason_code')
        if body.supplier_id is None:
            payload_fields.pop('supplier_id')
        payload = json.dumps(payload_fields, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
        previous = db.execute('SELECT * FROM movements WHERE request_id=?', (body.request_id,)).fetchone()
        if previous is not None:
            if previous['request_payload'] != payload:
                raise HTTPException(409, 'Request ID was used with different movement data.')
            return {key: previous[key] for key in MOVEMENT_COLUMNS.split(',')}
        # Only trusted shipment confirmation passes a historical snapshot. Public movement input cannot set it.
        supplier_name = supplier_snapshot
        if body.supplier_id is not None and supplier_snapshot is None:
            supplier = db.execute('SELECT name,is_active FROM suppliers WHERE id=?', (body.supplier_id,)).fetchone()
            if supplier is None:
                raise HTTPException(404, 'Supplier not found.')
            if not supplier['is_active']:
                raise HTTPException(422, 'Choose an active supplier.')
            supplier_name = supplier['name']
        sku = db.execute('SELECT on_hand,version FROM skus WHERE id=?', (body.sku_id,)).fetchone()
        if sku is None:
            raise HTTPException(404, 'SKU not found.')
        if sku['version'] != body.version:
            raise HTTPException(409, 'Inventory changed. Reload before saving.')
        balance = sku['on_hand'] + body.delta
        if not 0 <= balance <= MAX_STOCK:
            raise HTTPException(409, 'Movement exceeds the available stock or stock limit.')
        row = {'id': str(uuid4()), 'sku_id': body.sku_id, 'delta': body.delta, 'reason_code': body.reason_code,
               'supplier_id': body.supplier_id, 'supplier_name': supplier_name,
               'reason': body.reason, 'actor': 'local-admin',
               'created_at': datetime.now(timezone.utc).isoformat(),
               'balance_after': balance, 'request_id': body.request_id}
        db.execute('UPDATE skus SET on_hand=?,version=version+1 WHERE id=?', (balance, body.sku_id))
        db.execute('''INSERT INTO movements(id,sku_id,delta,reason,actor,created_at,balance_after,request_id,request_payload,reason_code,supplier_id,supplier_name)
            VALUES(:id,:sku_id,:delta,:reason,:actor,:created_at,:balance_after,:request_id,:request_payload,:reason_code,:supplier_id,:supplier_name)''',
            {**row, 'request_payload': payload})
        return row
