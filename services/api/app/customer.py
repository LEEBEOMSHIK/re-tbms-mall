"""Customer-only OAuth sessions, optional profiles and carts. No provider tokens persisted."""
import base64
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
from urllib.parse import urlencode, urlsplit, unquote
from urllib.request import Request, build_opener, HTTPRedirectHandler
from uuid import UUID, uuid4

from dotenv import dotenv_values
from fastapi import Depends, Header, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.config import SERVICE_DIR
from app.public_catalog import PublicCatalog

PROVIDERS = {
    'google': ('https://accounts.google.com/o/oauth2/v2/auth', 'https://oauth2.googleapis.com/token', 'https://openidconnect.googleapis.com/v1/userinfo'),
    'kakao': ('https://kauth.kakao.com/oauth/authorize', 'https://kauth.kakao.com/oauth/token', 'https://kapi.kakao.com/v2/user/me'),
}
DEFAULT_CUSTOMER_PATH = Path(__file__).resolve().parents[3] / '.local' / 'customers.sqlite3'

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def safe_return(value):
    decoded = unquote(value)
    if (len(value)>1000 or '%' in decoded or '\\' in decoded or any(ord(c)<32 or ord(c)==127 for c in decoded)
        or '://' in decoded or '//' in decoded):
        raise ValueError('Invalid return path.')
    parsed=urlsplit(decoded)
    if parsed.fragment or not re.fullmatch(r'/(cart|orders|account(?:\/(?:profile|addresses(?:\/(?:new|[a-f0-9-]{36}\/edit))?))?|checkout(?:/[A-Za-z0-9_-]+)?|products(?:/[A-Za-z0-9_-]+)?)', parsed.path):
        raise ValueError('Invalid return path.')
    return value

class Start(BaseModel):
    model_config=ConfigDict(extra='forbid',strict=True)
    return_to: str='/cart'
    _return=field_validator('return_to')(safe_return)

class Finish(BaseModel):
    model_config=ConfigDict(extra='forbid',strict=True)
    code: str=Field(min_length=1,max_length=4096)
    state: str=Field(min_length=1,max_length=256)
    flow_token: str=Field(min_length=1,max_length=256)

class Mutation(BaseModel):
    model_config=ConfigDict(extra='forbid',strict=True)
    version: int=Field(ge=0,le=2147483647)
    request_id: str=Field(min_length=36,max_length=36)
    @field_validator('request_id')
    @classmethod
    def valid_uuid(cls,value):
        return str(UUID(value))

class PutItem(Mutation):
    quantity: int=Field(ge=1,le=99)

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        return None

def provider_request(url,data=None,token=None):
    """Fixed official URLs only; redirects forbidden to protect credentials."""
    headers={'Accept':'application/json'}
    if token: headers['Authorization']='Bearer '+token
    payload=urlencode(data).encode() if data is not None else None
    if payload is not None: headers['Content-Type']='application/x-www-form-urlencoded'
    with build_opener(NoRedirect()).open(Request(url,data=payload,headers=headers),timeout=10) as response:
        raw=response.read(262145)
        if len(raw)>262144: raise ValueError('Oversized provider response')
        result=json.loads(raw)
        if not isinstance(result,dict): raise ValueError('Invalid provider response')
        return result

class CustomerStore:
    def __init__(self,path,catalog,env_file=None,transport=None,clock=None):
        self.path=Path(path); self.catalog=catalog
        self.transport=transport or provider_request; self.clock=clock or time.time
        values=dotenv_values(env_file or SERVICE_DIR/'.env',encoding='utf-8-sig')
        def setting(key,default=''): return os.environ.get(key,values.get(key) or default).strip()
        self.origin=setting('CUSTOMER_WEB_ORIGIN','http://localhost:3100').rstrip('/')
        parsed=urlsplit(self.origin)
        self.valid_origin=(parsed.scheme=='https' or (parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1'))) and bool(parsed.netloc) and not (parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password)
        self.credentials={p:(setting(p.upper()+'_CLIENT_ID'),setting(p.upper()+'_CLIENT_SECRET')) for p in PROVIDERS}

    @contextmanager
    def transaction(self):
        # Lazy creation prevents importing the app from touching customer data.
        self.path.parent.mkdir(parents=True,exist_ok=True)
        db=sqlite3.connect(self.path,timeout=10)
        db.row_factory=sqlite3.Row
        try:
            if db.execute('PRAGMA user_version').fetchone()[0]>1:
                raise HTTPException(503,'Customer storage version is not supported.')
            db.executescript('''
                CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY,provider TEXT NOT NULL,subject TEXT NOT NULL,UNIQUE(provider,subject));
                CREATE TABLE IF NOT EXISTS customer_avatars(customer_id TEXT PRIMARY KEY,avatar_url TEXT);
                CREATE TABLE IF NOT EXISTS customer_profiles(customer_id TEXT PRIMARY KEY,display_name TEXT,email TEXT);
                CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,customer_id TEXT NOT NULL,expires REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS flows(state_hash TEXT PRIMARY KEY,flow_hash TEXT NOT NULL,provider TEXT NOT NULL,verifier TEXT NOT NULL,return_to TEXT NOT NULL,expires REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS carts(customer_id TEXT PRIMARY KEY,version INTEGER NOT NULL);
                CREATE TABLE IF NOT EXISTS cart_items(customer_id TEXT NOT NULL,sku_id TEXT NOT NULL,quantity INTEGER NOT NULL,PRIMARY KEY(customer_id,sku_id));
                CREATE TABLE IF NOT EXISTS cart_requests(customer_id TEXT NOT NULL,request_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(customer_id,request_id));
                PRAGMA user_version=1;
            ''')
            db.execute('BEGIN IMMEDIATE')
            yield db
            db.commit()
        except Exception:
            db.rollback(); raise
        finally: db.close()

    def enabled(self,provider):
        return provider in PROVIDERS and bool(self.valid_origin and all(self.credentials[provider]))

    def start(self,provider,body):
        if not self.enabled(provider): raise HTTPException(503,'Customer login provider is not configured.')
        state=secrets.token_urlsafe(32); flow=secrets.token_urlsafe(32); verifier=secrets.token_urlsafe(48)
        with self.transaction() as db:
            db.execute('DELETE FROM flows WHERE expires<=?',(self.clock(),))
            if db.execute('SELECT COUNT(*) FROM flows').fetchone()[0]>=1000:
                raise HTTPException(429,'Login is busy. Try again later.')
            db.execute('INSERT INTO flows VALUES(?,?,?,?,?,?)',(digest(state),digest(flow),provider,verifier,body.return_to,self.clock()+600))
        params={'client_id':self.credentials[provider][0],'redirect_uri':self.origin+f'/api/customer/oauth/{provider}/callback','response_type':'code','state':state,
                'code_challenge':base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('='),'code_challenge_method':'S256'}
        if provider=='google': params['scope']='openid profile email'
        return {'authorization_url':PROVIDERS[provider][0]+'?'+urlencode(params),'flow_token':flow}

    def finish(self,provider,body):
        if not self.enabled(provider): raise HTTPException(503,'Customer login provider is not configured.')
        with self.transaction() as db:
            flow=db.execute('SELECT * FROM flows WHERE state_hash=?',(digest(body.state),)).fetchone()
            if not flow or flow['expires']<=self.clock() or flow['provider']!=provider or not secrets.compare_digest(flow['flow_hash'],digest(body.flow_token)):
                raise HTTPException(400,'Login expired or invalid. Start again.')
            db.execute('DELETE FROM flows WHERE state_hash=?',(digest(body.state),))
        # Consume before the external exchange, including provider failures.
        try:
            result=self.transport(PROVIDERS[provider][1],data={'grant_type':'authorization_code','client_id':self.credentials[provider][0],'client_secret':self.credentials[provider][1],
                'code':body.code,'redirect_uri':self.origin+f'/api/customer/oauth/{provider}/callback','code_verifier':flow['verifier']})
            token=result.get('access_token')
            if not isinstance(token,str) or not token or len(token)>16384: raise ValueError('Invalid token')
            identity=self.transport(PROVIDERS[provider][2],token=token)
            subject=identity.get('sub') if provider=='google' else identity.get('id')
            if provider=='google' and (not isinstance(subject,str) or not subject or len(subject)>255): raise ValueError('Invalid subject')
            if provider=='kakao' and (type(subject) is not int or subject<=0): raise ValueError('Invalid subject')
        except Exception:
            raise HTTPException(502,'Login provider could not complete authentication. Start again.') from None
        with self.transaction() as db:
            db.execute('INSERT OR IGNORE INTO customers VALUES(?,?,?)',(str(uuid4()),provider,str(subject)))
            customer=db.execute('SELECT * FROM customers WHERE provider=? AND subject=?',(provider,str(subject))).fetchone()
            name,email=self.profile(provider,identity)
            db.execute('INSERT INTO customer_profiles VALUES(?,?,?) ON CONFLICT(customer_id) DO UPDATE SET display_name=excluded.display_name,email=excluded.email',(customer['id'],name,email))
            db.execute('INSERT INTO customer_avatars VALUES(?,?) ON CONFLICT(customer_id) DO UPDATE SET avatar_url=excluded.avatar_url',(customer['id'],self.avatar(provider,identity)))
            customer=db.execute('SELECT c.*,p.display_name,p.email,a.avatar_url FROM customers c LEFT JOIN customer_profiles p ON p.customer_id=c.id LEFT JOIN customer_avatars a ON a.customer_id=c.id WHERE c.id=?',(customer['id'],)).fetchone()
            session=secrets.token_urlsafe(48)
            db.execute('DELETE FROM sessions WHERE expires<=?',(self.clock(),))
            db.execute('INSERT INTO sessions VALUES(?,?,?)',(digest(session),customer['id'],self.clock()+604800))
            db.execute('DELETE FROM sessions WHERE customer_id=? AND token_hash NOT IN (SELECT token_hash FROM sessions WHERE customer_id=? ORDER BY rowid DESC LIMIT 20)',(customer['id'],customer['id']))
        return {'session_token':session,'expires_in':604800,'return_to':flow['return_to'],'customer':self.public_customer(customer)}

    @staticmethod
    def avatar(provider,identity):
        value=identity.get('picture')
        if provider=='kakao':
            account=identity.get('kakao_account')
            profile=account.get('profile') if isinstance(account,dict) else None
            value=profile.get('profile_image_url') if isinstance(profile,dict) else None
        if not isinstance(value,str) or len(value)>2048 or any(ord(c)<=32 or ord(c)==127 for c in value) or '\\' in value: return None
        try:
            url=urlsplit(value)
            domain='googleusercontent.com' if provider=='google' else 'kakaocdn.net'
            host=url.hostname or ''
            if not (host==domain or host.endswith('.'+domain)) or url.username or url.password or url.port not in (None,443) or url.fragment: return None
            if url.scheme=='http' and provider=='kakao': return url._replace(scheme='https').geturl()
            return value if url.scheme=='https' else None
        except ValueError: return None

    @staticmethod
    def profile(provider,identity):
        def text(value,limit):
            if not isinstance(value,str): return None
            value=value.strip()
            return value if value and len(value)<=limit and not any(ord(c)<32 or ord(c)==127 for c in value) else None
        if provider=='google':
            name=identity.get('name'); email=identity.get('email') if identity.get('email_verified') is True else None
        else:
            account=identity.get('kakao_account')
            account=account if isinstance(account,dict) else {}
            profile=account.get('profile')
            name=profile.get('nickname') if isinstance(profile,dict) else None
            email=account.get('email') if account.get('is_email_valid') is True and account.get('is_email_verified') is True else None
        email=text(email,254)
        if email and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): email=None
        return text(name,100),email

    @staticmethod
    def public_customer(row):
        return {'id':row['id'],'provider':row['provider'],'display_name':row['display_name'] or '고객','email':row['email'],'avatar_url':row['avatar_url'],'profile_available':bool(row['display_name'] or row['email'])}

    def authenticate(self,authorization):
        scheme,_,token=(authorization or '').partition(' ')
        if scheme.lower()!='bearer' or not token or len(token)>256: raise HTTPException(401,'Customer login required.')
        with self.transaction() as db:
            row=db.execute('SELECT c.*,p.display_name,p.email,a.avatar_url FROM sessions s JOIN customers c ON c.id=s.customer_id LEFT JOIN customer_profiles p ON p.customer_id=c.id LEFT JOIN customer_avatars a ON a.customer_id=c.id WHERE s.token_hash=? AND s.expires>?',(digest(token),self.clock())).fetchone()
        if row is None: raise HTTPException(401,'Customer login required.')
        return self.public_customer(row)

    def item(self,catalog_db,sku_id,quantity):
        result={'sku_id':sku_id,'product_id':'','name':'구매할 수 없는 상품','color':'','size':'','quantity':quantity,'price':None,'discount_price':None,'effective_price':None,'image':None,'available_quantity':0,'available':False,'unavailable_reason':'상품을 구매할 수 없습니다.','line_total':None}
        sku=catalog_db.execute('SELECT * FROM skus WHERE id=? AND is_active=1',(sku_id,)).fetchone()
        if sku is None: return result
        try: product=PublicCatalog.product(catalog_db,sku['product_id'])
        except HTTPException as exc:
            if exc.status_code==404: return result
            raise
        result.update({k:product[k] for k in ['name','price','discount_price','effective_price','image']})
        result.update(product_id=product['id'],color=sku['color'],size=sku['size'],available_quantity=max(0,sku['on_hand']))
        if product['effective_price'] is None: result['unavailable_reason']='가격이 아직 정해지지 않았습니다.'
        elif sku['on_hand']<quantity: result['unavailable_reason']='현재 재고가 부족합니다.'
        else: result.update(available=True,unavailable_reason=None,line_total=quantity*product['effective_price'])
        return result

    def cart_result(self,db,catalog_db,customer_id):
        row=db.execute('SELECT version FROM carts WHERE customer_id=?',(customer_id,)).fetchone()
        items=[self.item(catalog_db,r['sku_id'],r['quantity']) for r in db.execute('SELECT sku_id,quantity FROM cart_items WHERE customer_id=? ORDER BY rowid',(customer_id,))]
        return {'version':row['version'] if row else 0,'items':items,'item_count':sum(i['quantity'] for i in items),'total':sum(i['line_total'] or 0 for i in items),'has_unavailable':any(not i['available'] for i in items)}

    def cart(self,customer_id):
        with self.transaction() as db, self.catalog.transaction() as catalog_db:
            return self.cart_result(db,catalog_db,customer_id)

    def mutate(self,customer_id,sku_id,body,delete=False):
        payload=json.dumps({'sku_id':sku_id,'delete':delete,**body.model_dump()},sort_keys=True)
        with self.transaction() as db, self.catalog.transaction() as catalog_db:
            previous=db.execute('SELECT payload FROM cart_requests WHERE customer_id=? AND request_id=?',(customer_id,body.request_id)).fetchone()
            if previous:
                if previous['payload']!=payload: raise HTTPException(409,'Request identifier was already used.')
                return self.cart_result(db,catalog_db,customer_id)
            current=self.cart_result(db,catalog_db,customer_id)
            if current['version']!=body.version: raise HTTPException(409,'Cart changed. Reload before saving.')
            if delete: db.execute('DELETE FROM cart_items WHERE customer_id=? AND sku_id=?',(customer_id,sku_id))
            else:
                item=self.item(catalog_db,sku_id,body.quantity)
                if not item['available']: raise HTTPException(409,item['unavailable_reason'])
                if len(current['items'])>=100 and not any(i['sku_id']==sku_id for i in current['items']): raise HTTPException(409,'Cart can contain at most 100 items.')
                db.execute('INSERT INTO cart_items VALUES(?,?,?) ON CONFLICT(customer_id,sku_id) DO UPDATE SET quantity=excluded.quantity',(customer_id,sku_id,body.quantity))
            db.execute('INSERT INTO carts VALUES(?,?) ON CONFLICT(customer_id) DO UPDATE SET version=excluded.version',(customer_id,body.version+1))
            db.execute('INSERT INTO cart_requests VALUES(?,?,?)',(customer_id,body.request_id,payload))
            return self.cart_result(db,catalog_db,customer_id)

def register_customer_routes(app,store):
    from app.checkout import register_checkout_routes
    register_checkout_routes(app,store)
    from app.customer_account import register_account_routes
    register_account_routes(app,store)
    prefix='/api/v1/customer'
    def no_cache(response:Response): response.headers['Cache-Control']='no-store'
    dependencies=[Depends(no_cache)]
    def customer(authorization:str|None=Header(default=None)):
        return store.authenticate(authorization)
    @app.get(prefix+'/providers',dependencies=dependencies)
    def providers(): return {'providers':[{'id':p,'enabled':store.enabled(p)} for p in PROVIDERS]}
    @app.post(prefix+'/oauth/{provider}/start',dependencies=dependencies)
    def start(provider:str,body:Start): return store.start(provider,body)
    @app.post(prefix+'/oauth/{provider}/finish',dependencies=dependencies)
    def finish(provider:str,body:Finish): return store.finish(provider,body)
    @app.get(prefix+'/me',dependencies=dependencies)
    def me(who=Depends(customer)): return {'customer':who}
    @app.post(prefix+'/logout',dependencies=dependencies)
    def logout(who=Depends(customer),authorization:str|None=Header(default=None)):
        with store.transaction() as db: db.execute('DELETE FROM sessions WHERE token_hash=?',(digest(authorization.partition(' ')[2]),))
        return {'ok':True}
    @app.get(prefix+'/cart',dependencies=dependencies)
    def cart(who=Depends(customer)): return store.cart(who['id'])
    @app.put(prefix+'/cart/items/{sku_id}',dependencies=dependencies)
    def put(sku_id:str,body:PutItem,who=Depends(customer)): return store.mutate(who['id'],sku_id,body)
    @app.delete(prefix+'/cart/items/{sku_id}',dependencies=dependencies)
    def delete(sku_id:str,body:Mutation,who=Depends(customer)): return store.mutate(who['id'],sku_id,body,delete=True)
