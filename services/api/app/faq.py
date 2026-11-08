"""FAQ publication: authenticated writes, public published-only reads."""
import json
import sqlite3
from pathlib import Path
from typing import Literal
from uuid import UUID
from fastapi import Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field

class FaqWrite(BaseModel):
    model_config=ConfigDict(extra='forbid',strict=True,str_strip_whitespace=True)
    category: Literal['orders','shipping','returns','product','account']
    question: str=Field(min_length=1,max_length=200)
    answer: str=Field(min_length=1,max_length=5000)
    position: int=Field(ge=0,le=9999)
    published: bool
    version: int=Field(ge=0)

class FaqStore:
    def __init__(self,path): self.path=path
    def connect(self):
        self.path.parent.mkdir(parents=True,exist_ok=True)
        db=sqlite3.connect(self.path,timeout=5)
        db.execute('CREATE TABLE IF NOT EXISTS faq (id TEXT PRIMARY KEY, body TEXT NOT NULL)')
        return db
    def items(self):
        db=self.connect()
        try: return sorted([json.loads(row[0]) for row in db.execute('SELECT body FROM faq')],key=lambda x:(x['position'],x['id']))
        finally: db.close()
    def get(self,uid):
        rows=[x for x in self.items() if x['id']==uid]
        if not rows: raise HTTPException(404,'FAQ not found')
        return rows[0]
    def save(self,uid,body):
        db=self.connect()
        try:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT body FROM faq WHERE id=?',(uid,)).fetchone()
            old=json.loads(row[0]) if row else None
            data=body.model_dump()
            if old and old['version']==body.version+1 and all(old[k]==v for k,v in data.items() if k!='version'):
                return old
            if (old['version'] if old else 0)!=body.version: raise HTTPException(409,'FAQ changed; reload before saving')
            if not old and db.execute('SELECT COUNT(*) FROM faq').fetchone()[0]>=500: raise HTTPException(422,'FAQ limit reached')
            saved={**data,'id':uid,'version':body.version+1}
            db.execute('INSERT INTO faq(id,body) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',(uid,json.dumps(saved,ensure_ascii=False)))
            db.commit(); return saved
        finally: db.close()

def register_faq_routes(app,require_admin,path:Path):
    store=FaqStore(path)
    def no_cache(response): response.headers['Cache-Control']='no-store'
    @app.get('/api/v1/faq')
    def public(response:Response):
        no_cache(response); return {'items':[x for x in store.items() if x['published']]}
    @app.get('/api/v1/admin/faq',dependencies=[Depends(require_admin)])
    def listing(response:Response):
        no_cache(response); return {'items':store.items()}
    @app.get('/api/v1/admin/faq/{uid}',dependencies=[Depends(require_admin)])
    def detail(uid:UUID,response:Response):
        no_cache(response); return store.get(str(uid))
    @app.put('/api/v1/admin/faq/{uid}',dependencies=[Depends(require_admin)])
    def save(uid:UUID,body:FaqWrite,response:Response):
        no_cache(response); return store.save(str(uid),body)
