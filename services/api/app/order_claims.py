"""Private return/exchange intake. No payment, carrier or inventory mutations."""
import base64
import binascii
import hashlib
import json
from contextlib import contextmanager
from datetime import date, datetime, timezone, timedelta
from io import BytesIO
from typing import Literal
from uuid import uuid4

from fastapi import Depends, Header, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from PIL import Image, UnidentifiedImageError
from starlette.responses import JSONResponse

from .checkout import Shipping
from .customer import Mutation
from .sales_orders import SalesOrderStore, encode_cursor, decode_cursor
from .order_reservations import held_quantity

Status = Literal['requested','reviewing','collection_pending','received','inspected','refund_pending','exchange_pending','conversion_requested','rejected','withdrawn']
Action = Literal['review','approve_collection','receive','inspect','queue_refund','queue_exchange','reject','request_conversion','withdraw','convert_return']
MAX_BODY = 9 * 1024 * 1024
SUMMARY = ('id','order_id','order_number','line_id','kind','status','quantity','reason','product_name','color','size','version','created_at','updated_at')

class ClaimCreate(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    request_id: str
    order_id: str
    line_id: str
    kind: Literal['return','exchange']
    quantity: int = Field(ge=1,le=1000000)
    reason: Literal['change_mind','size_color','defective','wrong_item']
    description: str = Field(min_length=10,max_length=2000)
    received_date: str = Field(pattern=r'^\d{4}-\d{2}-\d{2}$')
    shipping: Shipping
    target_sku_id: str | None = Field(default=None,max_length=128)
    photos: list[str] = Field(default_factory=list,max_length=3)
    _uuid = field_validator('request_id','order_id','line_id')(Mutation.valid_uuid.__func__)

    @field_validator('description')
    @classmethod
    def description_clean(cls,value):
        if len(value.strip()) < 10:
            raise ValueError('Please describe the reason in at least 10 characters.')
        return value.strip()

    @model_validator(mode='after')
    def kind_fields(self):
        if (self.kind == 'exchange') != bool(self.target_sku_id):
            raise ValueError('Only an exchange requires a target SKU.')
        try:
            date.fromisoformat(self.received_date)
        except ValueError:
            raise ValueError('Invalid received date.') from None
        return self

class ClaimAction(BaseModel):
    model_config = ConfigDict(extra='forbid',strict=True)
    request_id: str
    version: int = Field(ge=1)
    action: Action
    note: str = Field(default='',max_length=2000)
    _uuid = field_validator('request_id')(Mutation.valid_uuid.__func__)

def clean_photo(value):
    try:
        prefix, encoded = value.split(',',1)
        if prefix not in ('data:image/png;base64','data:image/jpeg;base64') or len(encoded)>2800000:
            raise ValueError()
        raw=base64.b64decode(encoded,validate=True)
        if len(raw)>2*1024*1024:
            raise ValueError()
        with Image.open(BytesIO(raw)) as photo:
            if photo.format not in ('PNG','JPEG') or photo.width>4096 or photo.height>4096 or photo.width*photo.height>16000000 or getattr(photo,'n_frames',1)!=1:
                raise ValueError()
            photo.load()
            # A newly constructed pixel image carries no EXIF, text or ICC metadata.
            pixels=photo.convert('RGBA')
            sanitized=Image.frombytes('RGBA',pixels.size,pixels.tobytes())
            out=BytesIO(); sanitized.save(out,format='PNG')
            if out.tell()>2*1024*1024:
                raise ValueError()
            return 'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()
    except (ValueError,binascii.Error,OSError,UnidentifiedImageError,Image.DecompressionBombError):
        raise HTTPException(422,'Photos must be single PNG/JPEG images, at most 2 MiB and 4096 px.') from None

def actions(claim):
    status,kind=claim['status'],claim['kind']
    customer=[]; admin=[]
    if status in ('requested','reviewing') or (status=='conversion_requested' and claim.get('conversion_from')=='reviewing'): customer.append('withdraw')
    if status=='conversion_requested': customer.append('convert_return')
    if status=='requested': admin=['review']
    if status=='reviewing': admin=['approve_collection','reject']
    if status=='collection_pending': admin=['receive']
    if status=='received': admin=['inspect']
    if status=='inspected': admin=['queue_refund' if kind=='return' else 'queue_exchange']
    if status in ('reviewing','received','inspected') and kind=='exchange': admin.append('request_conversion')
    return {'customer_actions':customer,'admin_actions':admin}

class ClaimStore:
    def __init__(self,catalog): self.orders=SalesOrderStore(catalog)

    @contextmanager
    def transaction(self):
        with self.orders.transaction() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS order_claims(id TEXT PRIMARY KEY,customer_id TEXT NOT NULL,
                order_id TEXT NOT NULL REFERENCES sales_orders(id),line_id TEXT NOT NULL REFERENCES sales_order_lines(id),
                status TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),created_at TEXT NOT NULL,document TEXT NOT NULL)''')
            db.execute('CREATE INDEX IF NOT EXISTS order_claims_owner ON order_claims(customer_id,created_at,id)')
            db.execute('CREATE INDEX IF NOT EXISTS order_claims_line ON order_claims(line_id,status)')
            db.execute('''CREATE TABLE IF NOT EXISTS order_claim_requests(actor TEXT NOT NULL,request_id TEXT NOT NULL,
                payload_hash TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(actor,request_id))''')
            yield db

    def read(self,db,identifier,customer_id=None):
        row=db.execute('SELECT * FROM order_claims WHERE id=?',(identifier,)).fetchone()
        if row is None or (customer_id is not None and row['customer_id']!=customer_id):
            raise HTTPException(404,'Claim not found.')
        result=json.loads(row['document'])
        return result | actions(result)

    def detail(self,identifier,customer_id=None):
        with self.transaction() as db: return self.read(db,identifier,customer_id)

    @staticmethod
    def remaining(db,line):
        used=db.execute("SELECT COALESCE(SUM(quantity),0) FROM order_claims WHERE line_id=? AND status NOT IN ('rejected','withdrawn')",(line['id'],)).fetchone()[0]
        return max(0,line['quantity']-used)

    @staticmethod
    def options(db,line):
        return [dict(sku) | {'available_quantity':max(0,sku['on_hand']-held_quantity(db,sku['sku_id']))} for sku in db.execute('''SELECT id AS sku_id,color,size,on_hand FROM skus WHERE product_id=(SELECT product_id FROM skus WHERE id=?) ORDER BY color,size,id''',(line['sku_id'],))]

    @staticmethod
    def eligible(order):
        return order['status'] in ('confirmed','closed') and order['payment_status']=='succeeded' and order['fulfillment_status'] in ('partially_shipped','shipped','delivered')

    def context(self,identifier,customer_id):
        with self.transaction() as db:
            order=self.orders.detail_in_transaction(db,identifier,customer_id,self.orders.clock())
            lines=db.execute('SELECT * FROM sales_order_lines WHERE order_id=? ORDER BY position',(identifier,)).fetchall()
            eligible=self.eligible(order)
            return {'order':order,'eligible':eligible,'ineligibility_reason':None if eligible else '결제 및 배송 상태를 확인한 뒤 접수할 수 있습니다.',
                'lines':[{'line_id':line['id'],'remaining_quantity':self.remaining(db,line),'exchange_options':[{k:v for k,v in option.items() if k!='on_hand'} for option in self.options(db,line)]} for line in lines]}

    def list(self,customer_id=None,*,order_id=None,status=None,limit=20,cursor=None):
        scope=json.dumps([order_id,status]); point=decode_cursor(cursor,scope)
        clauses=[]; params=[]
        for key,value in [('customer_id',customer_id),('order_id',order_id),('status',status)]:
            if value is not None: clauses.append(key+'=?'); params.append(value)
        if point: clauses.append('(created_at,id)<(?,?)'); params.extend(point)
        where=' WHERE '+' AND '.join(clauses) if clauses else ''
        with self.transaction() as db:
            rows=db.execute('SELECT * FROM order_claims'+where+' ORDER BY created_at DESC,id DESC LIMIT ?',(*params,limit+1)).fetchall()
            return {'claims':[{k:json.loads(row['document'])[k] for k in SUMMARY} for row in rows[:limit]],'next_cursor':encode_cursor(rows[limit-1],scope) if len(rows)>limit else None}

    @staticmethod
    def replay(db,actor,request_id,payload):
        digest=hashlib.sha256(json.dumps(payload,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
        row=db.execute('SELECT * FROM order_claim_requests WHERE actor=? AND request_id=?',(actor,request_id)).fetchone()
        if row and row['payload_hash']!=digest: raise HTTPException(409,'Request ID was already used with different content.')
        return digest,json.loads(row['response']) if row else None

    @staticmethod
    def receipt(db,actor,request_id,digest,result):
        db.execute('INSERT INTO order_claim_requests VALUES(?,?,?,?)',(actor,request_id,digest,json.dumps(result,ensure_ascii=False)))

    def create(self,body,customer_id):
        with self.transaction() as db:
            order=self.orders.detail_in_transaction(db,body.order_id,customer_id,self.orders.clock())
            digest,previous=self.replay(db,customer_id,body.request_id,{'create':body.model_dump()})
            if previous: return previous
            if not self.eligible(order): raise HTTPException(409,'Only paid and shipped orders can be submitted.')
            line=db.execute('SELECT * FROM sales_order_lines WHERE id=? AND order_id=?',(body.line_id,body.order_id)).fetchone()
            if line is None: raise HTTPException(404,'Order line not found.')
            if body.quantity>self.remaining(db,line): raise HTTPException(409,'Claim quantity exceeds the remaining order quantity.')
            today=datetime.now(timezone(timedelta(hours=9))).date()
            ordered=datetime.fromisoformat(order['created_at'].replace('Z','+00:00')).astimezone(timezone(timedelta(hours=9))).date()
            if not ordered<=date.fromisoformat(body.received_date)<=today: raise HTTPException(422,'Received date must be between the order date and today.')
            target=next((o for o in self.options(db,line) if o['sku_id']==body.target_sku_id),None) if body.kind=='exchange' else None
            if body.kind=='exchange' and target is None: raise HTTPException(422,'Select an existing SKU from the same product.')
            now=datetime.now(timezone.utc).isoformat(); identifier=str(uuid4())
            claim={k:v for k,v in body.model_dump().items() if k!='request_id'} | {'id':identifier,'order_number':order['number'],'status':'requested','version':1,'created_at':now,'updated_at':now,'product_name':line['product_name'],'color':line['color'],'size':line['size'],'target_color':target['color'] if target else None,'target_size':target['size'] if target else None,'photos':[clean_photo(p) for p in body.photos],
                'conversion_from':None,'events':[{'id':str(uuid4()),'action':'submit','status':'requested','note':'접수되었습니다. 수령일은 고객 진술이며 기간·비용은 관리자 확인 대상입니다.','actor':'customer','at':now}]}
            db.execute('INSERT INTO order_claims VALUES(?,?,?,?,?,?,?,?)',(identifier,customer_id,body.order_id,body.line_id,'requested',body.quantity,now,json.dumps(claim,ensure_ascii=False)))
            result=claim | actions(claim); self.receipt(db,customer_id,body.request_id,digest,result)
            return result

    def act(self,identifier,body,customer_id=None):
        actor=customer_id if customer_id is not None else 'admin'
        with self.transaction() as db:
            claim=self.read(db,identifier,customer_id)
            digest,previous=self.replay(db,actor,body.request_id,{'id':identifier,'action':body.model_dump()})
            if previous: return previous
            if body.version!=claim['version']: raise HTTPException(409,'Claim changed; reload before retrying.')
            if customer_id is None and not body.note.strip(): raise HTTPException(422,'An administrator note is required.')
            if body.action not in claim['customer_actions' if customer_id is not None else 'admin_actions']: raise HTTPException(409,'This action is not available in the current state.')
            next_status={'review':'reviewing','approve_collection':'collection_pending','receive':'received','inspect':'inspected','queue_refund':'refund_pending','queue_exchange':'exchange_pending','reject':'rejected','request_conversion':'conversion_requested','withdraw':'withdrawn','convert_return':'reviewing'}[body.action]
            if body.action=='request_conversion': claim['conversion_from']=claim['status']
            if body.action=='convert_return':
                next_status=claim.get('conversion_from') or 'reviewing'
                claim.update(kind='return',target_sku_id=None,target_color=None,target_size=None,conversion_from=None)
            claim['status']=next_status; claim['version']+=1; claim['updated_at']=datetime.now(timezone.utc).isoformat()
            claim['events'].append({'id':str(uuid4()),'action':body.action,'status':next_status,'note':body.note.strip(),'actor':'customer' if customer_id else 'admin','at':claim['updated_at']})
            claim.update(actions(claim))
            db.execute('UPDATE order_claims SET status=?,document=? WHERE id=?',(next_status,json.dumps(claim,ensure_ascii=False),identifier))
            self.receipt(db,actor,body.request_id,digest,claim)
            return claim

def register_order_claim_routes(app,catalog,customers,require_admin):
    store=ClaimStore(catalog)

    @app.middleware('http')
    async def claim_body_limit(request:Request,call_next):
        if request.method=='POST' and request.url.path.startswith(('/api/v1/customer/claims','/api/v1/admin/claims')):
            size=0; chunks=[]
            async for chunk in request.stream():
                size+=len(chunk)
                if size>MAX_BODY: return JSONResponse({'detail':'Claim body is too large.'},status_code=413,headers={'Cache-Control':'no-store'})
                chunks.append(chunk)
            request._body=b''.join(chunks)
        response=await call_next(request)
        if '/claims' in request.url.path or '/claim-context' in request.url.path: response.headers['Cache-Control']='no-store'
        return response

    def customer(authorization:str|None=Header(default=None)): return customers.authenticate(authorization)

    @app.get('/api/v1/customer/claim-context/{order_id}')
    def context(order_id:str,who=Depends(customer)): return store.context(order_id,who['id'])

    @app.get('/api/v1/customer/claims')
    def customer_list(who=Depends(customer),order_id:str|None=None,status:Status|None=None,limit:int=Query(20,ge=1,le=50),cursor:str|None=Query(None,max_length=1024)):
        return store.list(who['id'],order_id=order_id,status=status,limit=limit,cursor=cursor)

    @app.post('/api/v1/customer/claims',status_code=201)
    def create(body:ClaimCreate,who=Depends(customer)): return store.create(body,who['id'])

    @app.get('/api/v1/customer/claims/{identifier}')
    def detail(identifier:str,who=Depends(customer)): return store.detail(identifier,who['id'])

    @app.post('/api/v1/customer/claims/{identifier}')
    def customer_action(identifier:str,body:ClaimAction,who=Depends(customer)): return store.act(identifier,body,who['id'])

    @app.get('/api/v1/admin/claims',dependencies=[Depends(require_admin)])
    def admin_list(order_id:str|None=None,status:Status|None=None,limit:int=Query(20,ge=1,le=50),cursor:str|None=Query(None,max_length=1024)):
        return store.list(order_id=order_id,status=status,limit=limit,cursor=cursor)

    @app.get('/api/v1/admin/claims/{identifier}',dependencies=[Depends(require_admin)])
    def admin_detail(identifier:str): return store.detail(identifier)

    @app.post('/api/v1/admin/claims/{identifier}',dependencies=[Depends(require_admin)])
    def admin_action(identifier:str,body:ClaimAction): return store.act(identifier,body)
