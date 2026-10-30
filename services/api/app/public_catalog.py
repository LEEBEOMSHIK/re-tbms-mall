"""Explicit display-only publication; public responses use a narrow allowlist."""
import base64
from datetime import datetime, timezone
from typing import Literal
from fastapi import HTTPException, Response, Depends
from pydantic import BaseModel, ConfigDict, Field
from app.reviews import review_summary
from app.product_details import ProductDetails

class PublicationUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    status: Literal['draft', 'published', 'paused']
    price: int | None = Field(default=None, ge=0, le=1_000_000_000)
    discount_price: int | None = Field(default=None, ge=0, le=1_000_000_000)
    version: int = Field(ge=0, le=2_147_483_647)


def migrate_publication(db):
    db.execute('''CREATE TABLE product_publications(product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK(status IN ('draft','published','paused')), price INTEGER CHECK(price>=0),
        version INTEGER NOT NULL CHECK(version>=0))''')
    db.execute('''CREATE TABLE publication_history(id INTEGER PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        status TEXT NOT NULL, price INTEGER, created_at TEXT NOT NULL)''')
    db.execute('PRAGMA user_version=14')


def migrate_discount(db):
    db.execute('ALTER TABLE product_publications ADD COLUMN discount_price INTEGER CHECK(discount_price>=0)')
    db.execute('ALTER TABLE publication_history ADD COLUMN discount_price INTEGER CHECK(discount_price>=0)')
    db.execute('PRAGMA user_version=16')


def pricing(price, discount_price):
    return {'price':price,'discount_price':discount_price,
            'effective_price':discount_price if discount_price is not None else price,
            'discount_rate':((price-discount_price)*100)//price if discount_price is not None else None}


class PublicCatalog:
    def __init__(self, catalog): self.catalog = catalog

    @staticmethod
    def source(db, product_id):
        p = db.execute('SELECT * FROM products WHERE id=?', (product_id,)).fetchone()
        if p is None: raise HTTPException(404, 'Product not found.')
        publication = db.execute('SELECT * FROM product_publications WHERE product_id=?', (product_id,)).fetchone()
        state = dict(publication) if publication else {'product_id': product_id, 'status':'draft','price':None,'discount_price':None,'version':0}
        images = [dict(r) for r in db.execute("SELECT id,kind,name,alt FROM product_images WHERE product_id=? AND kind IN ('model','garment') ORDER BY rowid", (product_id,))]
        options = [dict(r) for r in db.execute('SELECT id,color,size,on_hand FROM skus WHERE product_id=? AND is_active=1 ORDER BY rowid', (product_id,))]
        category = db.execute('SELECT c.is_active,p.is_active AS parent_active FROM categories c LEFT JOIN categories p ON p.id=c.parent_id WHERE c.id=?',(p['category_id'],)).fetchone()
        reasons=[]
        if not p['description'].strip(): reasons.append('고객용 상품 설명을 입력해 주세요.')
        if not images: reasons.append('고객용 모델 또는 의류 이미지를 등록해 주세요.')
        if not category or not category['is_active'] or not category['parent_active']: reasons.append('사용 중인 상품 카테고리를 선택해 주세요.')
        if not options: reasons.append('사용 중인 색상·사이즈를 등록해 주세요.')
        return dict(p),state,images,options,reasons

    @classmethod
    def admin_state(cls,db,product_id):
        p,state,images,options,reasons=cls.source(db,product_id)
        public_visible=state['status']=='published' and not reasons
        if not any(o['on_hand']>0 for o in options): reasons.append('사용 중인 옵션에 재고를 입고해 주세요.')
        return {**state,**pricing(state['price'],state['discount_price']),'product_name':p['name'],'internal_name':p['internal_name'],'public_visible':public_visible,'can_publish':not reasons,'reasons':reasons,'history':[{**dict(r),**pricing(r['price'],r['discount_price'])} for r in db.execute('SELECT status,price,discount_price,created_at FROM publication_history WHERE product_id=? ORDER BY id DESC',(product_id,))]}

    def get_publication(self,product_id):
        with self.catalog.transaction() as db: return self.admin_state(db,product_id)

    def update_publication(self,product_id,body):
        with self.catalog.transaction() as db:
            current=self.admin_state(db,product_id)
            if current['version']!=body.version: raise HTTPException(409,'Publication changed. Reload before saving.')
            discount=body.discount_price if 'discount_price' in body.model_fields_set else current['discount_price']
            if discount is not None and (body.price is None or body.price<=0 or discount>=body.price):
                raise HTTPException(422,'Discount price must be lower than a positive base price.')
            # A published sold-out product can retain its state; re-publication must satisfy readiness.
            if body.status=='published' and current['status']!='published' and not current['can_publish']:
                raise HTTPException(422, current['reasons'])
            db.execute('INSERT INTO product_publications(product_id,status,price,discount_price,version) VALUES(?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET status=excluded.status,price=excluded.price,discount_price=excluded.discount_price,version=excluded.version',(product_id,body.status,body.price,discount,body.version+1))
            db.execute('INSERT INTO publication_history(product_id,status,price,discount_price,created_at) VALUES(?,?,?,?,?)',(product_id,body.status,body.price,discount,datetime.now(timezone.utc).isoformat()))
            return self.admin_state(db,product_id)

    @classmethod
    def product(cls,db,product_id,public=True):
        p,state,images,options,reasons=cls.source(db,product_id)
        if public and (state['status']!='published' or reasons): raise HTTPException(404,'Product not found.')
        for image in images: image['url']=f"/api/v1/products/{product_id}/images/{image['id']}"
        result={'id':p['id'],'name':p['name'],'category_id':p['category_id'],'description':p['description'],
            'details':ProductDetails.model_validate_json(p['details']).model_dump(),
            **pricing(state['price'],state['discount_price']),'image':images[0]['url'] if images else '',
            'color':' · '.join(dict.fromkeys(o['color'] for o in options)),
            'review_summary':review_summary(db,product_id),
            'sold_out':not any(o['on_hand']>0 for o in options),
            'options':[{'id':o['id'],'color':o['color'],'size':o['size'],'available':o['on_hand']>0} for o in options], 'images':images}
        if not public: result['publication_status']=state['status']
        return result

    def listing(self,public=True):
        with self.catalog.transaction() as db:
            products=[]
            for row in db.execute('SELECT id FROM products ORDER BY rowid DESC'):
                try: products.append(self.product(db,row['id'],public))
                except HTTPException as exc:
                    if exc.status_code!=404: raise
            category_ids={p['category_id'] for p in products}
            categories=[{'id':r['id'],'name':r['name'],'parent_id':r['parent_id']} for r in db.execute('SELECT id,name,parent_id FROM categories ORDER BY sort_order,rowid')]
            if public:
                parents={c['parent_id'] for c in categories if c['id'] in category_ids}
                categories=[c for c in categories if c['id'] in category_ids or c['id'] in parents]
            return {'products':products,'categories':categories}

    def detail(self,product_id):
        with self.catalog.transaction() as db: return self.product(db,product_id)

    def image(self,product_id,image_id):
        with self.catalog.transaction() as db:
            self.product(db,product_id)
            row=db.execute("SELECT data_url FROM product_images WHERE id=? AND product_id=? AND kind IN ('model','garment')",(image_id,product_id)).fetchone()
            if row is None: raise HTTPException(404,'Image not found.')
            header,data=row['data_url'].split(',',1)
            return Response(base64.b64decode(data),media_type=header[5:].split(';')[0],headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'})


def register_public_catalog_routes(app,public,require_admin):
    @app.get('/api/v1/products')
    def products(): return public.listing()
    @app.get('/api/v1/products/{product_id}')
    def product(product_id:str): return public.detail(product_id)
    @app.get('/api/v1/products/{product_id}/images/{image_id}')
    def image(product_id:str,image_id:str): return public.image(product_id,image_id)
    @app.get('/api/v1/admin/products/{product_id}/publication',dependencies=[Depends(require_admin)])
    def publication(product_id:str): return public.get_publication(product_id)
    @app.put('/api/v1/admin/products/{product_id}/publication',dependencies=[Depends(require_admin)])
    def save_publication(product_id:str,body:PublicationUpdate): return public.update_publication(product_id,body)
