"""Private customer inquiries; no payment or outbound messaging side effects."""
import json
import sqlite3
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID
from fastapi import Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field

class InquiryWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)
    category: Literal["product", "order", "shipping", "returns", "other"]
    title: str = Field(min_length=1, max_length=150)
    content: str = Field(min_length=1, max_length=5000)

class ReplyWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)
    answer: str = Field(min_length=1, max_length=5000)
    version: int = Field(ge=1)

class InquiryStore:
    def __init__(self, path): self.path = path
    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(self.path, timeout=5)
        db.row_factory = sqlite3.Row
        db.execute("CREATE TABLE IF NOT EXISTS inquiries(id TEXT PRIMARY KEY, owner TEXT NOT NULL, created TEXT NOT NULL, body TEXT NOT NULL)")
        db.execute("CREATE INDEX IF NOT EXISTS inquiry_owner ON inquiries(owner,created)")
        return db
    def get(self, uid, owner=None):
        db = self.connect()
        try:
            row = db.execute("SELECT * FROM inquiries WHERE id=?", (uid,)).fetchone()
            if not row or (owner is not None and row['owner'] != owner): raise HTTPException(404, 'Inquiry not found')
            return json.loads(row['body'])
        finally: db.close()
    def listing(self, owner=None, page=1, q="", category=None, status=None):
        db = self.connect()
        try:
            clauses, args = (['owner=?'], [owner]) if owner is not None else ([], [])
            for key, value in [('category',category),('status',status)]:
                if value:
                    clauses.append("json_extract(body,'$."+key+"')=?"); args.append(value)
            if q.strip():
                clauses.append("(instr(lower(json_extract(body,'$.title')),lower(?))>0 OR instr(lower(json_extract(body,'$.content')),lower(?))>0)")
                args.extend([q.strip(),q.strip()])
            where = ' WHERE '+' AND '.join(clauses) if clauses else ''
            total = db.execute('SELECT COUNT(*) FROM inquiries'+where, args).fetchone()[0]
            rows = db.execute('SELECT body FROM inquiries'+where+' ORDER BY created DESC,id DESC LIMIT 20 OFFSET ?', (*args,(page-1)*20)).fetchall()
            return {'items':[{k:v for k,v in json.loads(r['body']).items() if k not in ('content','answer')} for r in rows], 'total':total, 'page':page}
        finally: db.close()
    def create(self, uid, owner, body):
        db = self.connect()
        try:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT * FROM inquiries WHERE id=?',(uid,)).fetchone()
            if row:
                old=json.loads(row['body'])
                if row['owner'] != owner: raise HTTPException(404,'Inquiry not found')
                if any(old[k] != v for k,v in body.model_dump().items()): raise HTTPException(409,'Request already submitted')
                return old
            now=datetime.now(timezone.utc).isoformat()
            item={**body.model_dump(),'id':uid,'created_at':now,'updated_at':now,'status':'waiting','answer':None,'version':1}
            db.execute('INSERT INTO inquiries VALUES(?,?,?,?)',(uid,owner,now,json.dumps(item,ensure_ascii=False)))
            db.commit()
            return item
        finally: db.close()
    def reply(self, uid, body):
        db=self.connect()
        try:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT body FROM inquiries WHERE id=?',(uid,)).fetchone()
            if not row: raise HTTPException(404,'Inquiry not found')
            item=json.loads(row['body'])
            if item['version']==body.version+1 and item['answer']==body.answer: return item
            if item['version']!=body.version: raise HTTPException(409,'Inquiry changed')
            item.update(answer=body.answer,status='answered',version=body.version+1,updated_at=datetime.now(timezone.utc).isoformat())
            db.execute('UPDATE inquiries SET body=? WHERE id=?',(json.dumps(item,ensure_ascii=False),uid)); db.commit()
            return item
        finally: db.close()

def register_inquiry_routes(app, customers, require_admin, path):
    store=InquiryStore(path)
    def customer(authorization:str|None=Header(default=None)): return customers.authenticate(authorization)
    def private(response:Response): response.headers['Cache-Control']='no-store'
    @app.get('/api/v1/customer/inquiries')
    def listing(response:Response, who=Depends(customer),page:int=Query(1,ge=1,le=100000),q:str=Query("",max_length=150),category:Literal["product","order","shipping","returns","other"]|None=None,status:Literal["waiting","answered"]|None=None):
        private(response); return store.listing(who['id'],page,q,category,status)
    @app.get('/api/v1/customer/inquiries/{uid}')
    def detail(uid:UUID,response:Response,who=Depends(customer)):
        private(response); return store.get(str(uid),who['id'])
    @app.put('/api/v1/customer/inquiries/{uid}')
    def create(uid:UUID,body:InquiryWrite,response:Response,who=Depends(customer)):
        private(response); return store.create(str(uid),who['id'],body)
    @app.get('/api/v1/admin/inquiries',dependencies=[Depends(require_admin)])
    def admin_list(response:Response,page:int=Query(1,ge=1,le=100000),q:str=Query("",max_length=150),category:Literal["product","order","shipping","returns","other"]|None=None,status:Literal["waiting","answered"]|None=None):
        private(response); return store.listing(page=page,q=q,category=category,status=status)
    @app.get('/api/v1/admin/inquiries/{uid}',dependencies=[Depends(require_admin)])
    def admin_detail(uid:UUID,response:Response):
        private(response); return store.get(str(uid))
    @app.put('/api/v1/admin/inquiries/{uid}',dependencies=[Depends(require_admin)])
    def answer(uid:UUID,body:ReplyWrite,response:Response):
        private(response); return store.reply(str(uid),body)
