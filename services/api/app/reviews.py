"""Purchase-verified review boundary; no customer credentials are accepted by default."""
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
from typing import Literal, Protocol
from uuid import UUID

from fastapi import Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator


@dataclass(frozen=True)
class ReviewCustomer:
    customer_id: str
    display_name: str


class PurchaseVerifier(Protocol):
    def authenticate(self, request: Request) -> ReviewCustomer: ...
    def purchase_reference(self, customer: ReviewCustomer, product_id: str) -> str | None: ...


class ReviewInput(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, str_strip_whitespace=True)


class ReviewCreate(ReviewInput):
    id: str
    rating: int = Field(ge=1, le=5)
    body: str = Field(min_length=1, max_length=3000)

    @field_validator('id')
    @classmethod
    def uuid_id(cls, value):
        try: return str(UUID(value))
        except ValueError: raise ValueError('UUID required.') from None


class ReviewUpdate(ReviewInput):
    version: int = Field(ge=0, le=2_147_483_647)
    rating: int = Field(ge=1, le=5)
    body: str = Field(min_length=1, max_length=3000)


class ReviewDelete(ReviewInput):
    version: int = Field(ge=0, le=2_147_483_647)


class ReviewModeration(ReviewInput):
    version: int = Field(ge=0, le=2_147_483_647)
    hidden: bool
    reason: str = Field(min_length=1, max_length=500)
    reply: str = Field(max_length=2000)


def migrate_reviews(db):
    db.execute('''CREATE TABLE product_reviews(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),
        customer_id TEXT NOT NULL,purchase_reference TEXT NOT NULL,author_label TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),body TEXT NOT NULL,
        hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1)),deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1)),
        reply TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0),
        created_at TEXT NOT NULL,updated_at TEXT NOT NULL,request_hash TEXT NOT NULL)''')
    db.execute('CREATE UNIQUE INDEX one_active_product_review ON product_reviews(product_id,customer_id) WHERE deleted=0')
    db.execute('CREATE INDEX review_public_product ON product_reviews(product_id,hidden,deleted)')
    db.execute('''CREATE TABLE review_history(id INTEGER PRIMARY KEY,review_id TEXT NOT NULL REFERENCES product_reviews(id),
        action TEXT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,snapshot TEXT NOT NULL,created_at TEXT NOT NULL)''')
    db.execute('PRAGMA user_version=15')


def review_summary(db, product_id):
    row=db.execute('SELECT COUNT(*) AS count,AVG(rating) AS average FROM product_reviews WHERE product_id=? AND hidden=0 AND deleted=0',(product_id,)).fetchone()
    return {'review_count':row['count'],'average_rating':round(row['average']+1e-10,1) if row['count'] else None}


class ReviewStore:
    def __init__(self,catalog,verifier:PurchaseVerifier|None=None):
        self.catalog=catalog;self.verifier=verifier

    def buyer(self,request,product_id):
        if self.verifier is None:
            if request.headers.get('authorization') or request.cookies:
                raise HTTPException(503,'Purchase verification is not connected.')
            raise HTTPException(401,'Verified customer authentication is required.')
        try:
            customer=self.verifier.authenticate(request)
        except HTTPException as exc:
            raise HTTPException(exc.status_code if exc.status_code in (401,403) else 503,'Customer or purchase verification failed.') from None
        except Exception:
            raise HTTPException(503,'Customer verification unavailable.') from None
        if not isinstance(customer,ReviewCustomer) or not isinstance(customer.customer_id,str) or not isinstance(customer.display_name,str) or not customer.customer_id.strip() or len(customer.customer_id)>256 or not customer.display_name.strip() or len(customer.display_name)>80:
            raise HTTPException(503,'Customer verification unavailable.')
        try:
            purchase=self.verifier.purchase_reference(customer,product_id)
        except HTTPException as exc:
            raise HTTPException(exc.status_code if exc.status_code in (401,403) else 503,'Customer or purchase verification failed.') from None
        except Exception:
            raise HTTPException(503,'Purchase verification unavailable.') from None
        if not isinstance(purchase,str) or not purchase.strip() or len(purchase)>256:
            raise HTTPException(403,'Only a verified purchaser of this product can write a review.')
        return customer,purchase

    @staticmethod
    def require_product(db,product_id,public=False):
        if public:
            from app.public_catalog import PublicCatalog
            PublicCatalog.product(db,product_id)
        elif db.execute('SELECT id FROM products WHERE id=?',(product_id,)).fetchone() is None:
            raise HTTPException(404,'Product not found.')

    @staticmethod
    def public_row(row):
        return {k:row[k] for k in ('id','rating','body','author_label','created_at','updated_at','reply')}

    @classmethod
    def owned_row(cls,row):
        return {**cls.public_row(row),'version':row['version'],'hidden':bool(row['hidden']),'deleted':bool(row['deleted'])}

    @classmethod
    def admin_row(cls,db,row):
        product=db.execute('SELECT name FROM products WHERE id=?',(row['product_id'],)).fetchone()
        history=[dict(r) for r in db.execute('SELECT action,reason,created_at FROM review_history WHERE review_id=? ORDER BY id DESC',(row['id'],))]
        return {**cls.owned_row(row),'product_id':row['product_id'],'product_name':product['name'],'history':history}

    @staticmethod
    def history(db,row,action,reason,actor):
        snapshot={k:row[k] for k in ('rating','body','hidden','deleted','reply','version')}
        db.execute('INSERT INTO review_history(review_id,action,reason,actor,snapshot,created_at) VALUES(?,?,?,?,?,?)',(row['id'],action,reason,actor,json.dumps(snapshot,ensure_ascii=False),row['updated_at']))

    def public_list(self,product_id,page=1,page_size=20):
        with self.catalog.transaction() as db:
            self.require_product(db,product_id,public=True)
            summary=review_summary(db,product_id)
            rows=db.execute('SELECT * FROM product_reviews WHERE product_id=? AND hidden=0 AND deleted=0 ORDER BY created_at DESC,rowid DESC LIMIT ? OFFSET ?',(product_id,page_size,(page-1)*page_size)).fetchall()
            return {'reviews':[self.public_row(r) for r in rows],'total':summary['review_count'],'page':page,'page_size':page_size,'summary':summary,'can_write':False,'write_unavailable_reason':'purchase_verification_unavailable'}

    def create(self,product_id,body,request):
        customer,purchase=self.buyer(request,product_id)
        fingerprint=hashlib.sha256(json.dumps({'product_id':product_id,'customer_id':customer.customer_id,**body.model_dump()},sort_keys=True).encode()).hexdigest()
        with self.catalog.transaction() as db:
            self.require_product(db,product_id,public=True)
            existing=db.execute('SELECT * FROM product_reviews WHERE id=?',(body.id,)).fetchone()
            if existing:
                if existing['request_hash']!=fingerprint: raise HTTPException(409,'Review identifier already used.')
                return self.owned_row(existing)
            if db.execute('SELECT id FROM product_reviews WHERE product_id=? AND customer_id=? AND deleted=0',(product_id,customer.customer_id)).fetchone():
                raise HTTPException(409,'A review for this product already exists. Edit that review instead.')
            now=datetime.now(timezone.utc).isoformat()
            db.execute('INSERT INTO product_reviews(id,product_id,customer_id,purchase_reference,author_label,rating,body,created_at,updated_at,request_hash) VALUES(?,?,?,?,?,?,?,?,?,?)',(body.id,product_id,customer.customer_id,purchase,customer.display_name.strip(),body.rating,body.body,now,now,fingerprint))
            row=db.execute('SELECT * FROM product_reviews WHERE id=?',(body.id,)).fetchone()
            self.history(db,row,'created','',customer.customer_id)
            return self.owned_row(row)

    def customer_change(self,product_id,review_id,body,request,delete=False):
        customer,_=self.buyer(request,product_id)
        with self.catalog.transaction() as db:
            row=db.execute('SELECT * FROM product_reviews WHERE id=? AND product_id=? AND customer_id=?',(review_id,product_id,customer.customer_id)).fetchone()
            if row is None: raise HTTPException(404,'Review not found.')
            if row['deleted']: raise HTTPException(409,'Review was deleted.')
            if row['version']!=body.version: raise HTTPException(409,'Review changed. Reload before saving.')
            now=datetime.now(timezone.utc).isoformat()
            if delete: db.execute('UPDATE product_reviews SET deleted=1,version=version+1,updated_at=? WHERE id=?',(now,review_id))
            else: db.execute('UPDATE product_reviews SET rating=?,body=?,version=version+1,updated_at=? WHERE id=?',(body.rating,body.body,now,review_id))
            result=db.execute('SELECT * FROM product_reviews WHERE id=?',(review_id,)).fetchone()
            self.history(db,result,'deleted' if delete else 'updated','',customer.customer_id)
            return self.owned_row(result)

    def admin_list(self,product_id='',visibility='all'):
        with self.catalog.transaction() as db:
            where=[];args=[]
            if product_id: self.require_product(db,product_id);where.append('product_id=?');args.append(product_id)
            if visibility=='visible': where.append('hidden=0 AND deleted=0')
            if visibility=='hidden': where.append('hidden=1 AND deleted=0')
            if visibility=='deleted': where.append('deleted=1')
            sql='SELECT * FROM product_reviews'+(' WHERE '+' AND '.join(where) if where else '')+' ORDER BY created_at DESC,rowid DESC'
            return {'reviews':[self.admin_row(db,r) for r in db.execute(sql,args)]}

    def admin_get(self,review_id):
        with self.catalog.transaction() as db:
            row=db.execute('SELECT * FROM product_reviews WHERE id=?',(review_id,)).fetchone()
            if row is None: raise HTTPException(404,'Review not found.')
            return self.admin_row(db,row)

    def moderate(self,review_id,body):
        with self.catalog.transaction() as db:
            row=db.execute('SELECT * FROM product_reviews WHERE id=?',(review_id,)).fetchone()
            if row is None: raise HTTPException(404,'Review not found.')
            if row['deleted']: raise HTTPException(409,'A customer-deleted review cannot be changed or restored.')
            if row['version']!=body.version: raise HTTPException(409,'Review changed. Reload before saving.')
            action='hidden' if body.hidden and not row['hidden'] else 'restored' if not body.hidden and row['hidden'] else 'replied'
            now=datetime.now(timezone.utc).isoformat()
            db.execute('UPDATE product_reviews SET hidden=?,reply=?,version=version+1,updated_at=? WHERE id=?',(int(body.hidden),body.reply,now,review_id))
            result=db.execute('SELECT * FROM product_reviews WHERE id=?',(review_id,)).fetchone()
            self.history(db,result,action,body.reason,'internal-admin')
            return self.admin_row(db,result)


def register_review_routes(app,store,require_admin):
    @app.get('/api/v1/products/{product_id}/reviews')
    def reviews(product_id:str,response:Response,page:int=Query(1,ge=1,le=1_000_000),page_size:int=Query(20,ge=10,le=50)):
        response.headers['Cache-Control']='no-store'
        if page_size not in (10,20,50): raise HTTPException(422,'Choose 10, 20 or 50 reviews per page.')
        return store.public_list(product_id,page,page_size)
    @app.post('/api/v1/products/{product_id}/reviews',status_code=201)
    def create(product_id:str,body:ReviewCreate,request:Request): return store.create(product_id,body,request)
    @app.put('/api/v1/products/{product_id}/reviews/{review_id}')
    def update(product_id:str,review_id:str,body:ReviewUpdate,request:Request): return store.customer_change(product_id,review_id,body,request)
    @app.delete('/api/v1/products/{product_id}/reviews/{review_id}')
    def delete(product_id:str,review_id:str,body:ReviewDelete,request:Request): return store.customer_change(product_id,review_id,body,request,True)
    @app.get('/api/v1/admin/reviews',dependencies=[Depends(require_admin)])
    def admin_reviews(product_id:str='',visibility:Literal['all','visible','hidden','deleted']='all'): return store.admin_list(product_id,visibility)
    @app.get('/api/v1/admin/reviews/{review_id}',dependencies=[Depends(require_admin)])
    def admin_review(review_id:str): return store.admin_get(review_id)
    @app.put('/api/v1/admin/reviews/{review_id}',dependencies=[Depends(require_admin)])
    def moderate(review_id:str,body:ReviewModeration): return store.moderate(review_id,body)
