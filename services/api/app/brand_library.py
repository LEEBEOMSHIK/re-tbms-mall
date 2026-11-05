"""Versioned logo library: immutable originals, administrator drafts, factory publication."""
import base64
import binascii
import json
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from fastapi import Depends, Header, HTTPException, Request, Response
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field, model_validator, ValidationError
from starlette.concurrency import run_in_threadpool
from app.factory import FactoryStore

ROOT=Path(__file__).resolve().parents[3]
DEFAULT_PATH=ROOT/'.local'/'brand-library.sqlite3'
PRESETS={'logo_long':('가로형 로고','가로 공간이 넓은 문서·배너와 브랜드 표시에 사용합니다.'),'logo_short':('정사각형 로고','정사각형 브랜드 영역과 표지 참고에 사용합니다.'),'logo_icon':('심볼형 로고','작은 브랜드 표시와 아이콘 참고에 사용합니다.')}
class Strict(BaseModel):
    model_config=ConfigDict(extra='forbid',strict=True,str_strip_whitespace=True)
class LibraryItem(Strict):
    asset_id:str=Field(min_length=1,max_length=64,pattern=r'^[a-z0-9_-]+$')
    title:str=Field(min_length=1,max_length=80)
    usage:str=Field(min_length=1,max_length=300)
class LibraryContent(Strict):
    assets:list[LibraryItem]=Field(min_length=1,max_length=12)
    notes:str=Field(min_length=1,max_length=500)
    @model_validator(mode='after')
    def unique(self):
        if len({a.asset_id for a in self.assets})!=len(self.assets): raise ValueError('Duplicate asset')
        return self
class LibraryUpdate(Strict):
    revision:int=Field(ge=0)
    content:LibraryContent
class Revision(Strict):
    revision:int=Field(ge=0)
class Upload(Strict):
    filename:str=Field(min_length=1,max_length=100)
    content_base64:str=Field(min_length=1,max_length=2796208)

class LibraryStore:
    def __init__(self,path): self.path=Path(path)
    def initial(self):
        content={'assets':[{'asset_id':key,'title':value[0],'usage':value[1]} for key,value in PRESETS.items()],'notes':'기존 RE:TAG 로고 원본 3종'}
        return {'revision':0,'published_version':1,'published_at':'2026-11-02T00:00:00+00:00','draft':content,'published':content}
    @contextmanager
    def transaction(self):
        db=None
        try:
            self.path.parent.mkdir(parents=True,exist_ok=True)
            db=sqlite3.connect(self.path,timeout=5);db.execute('BEGIN IMMEDIATE')
            db.execute('CREATE TABLE IF NOT EXISTS library_state(id INTEGER PRIMARY KEY CHECK(id=1),body TEXT NOT NULL)')
            db.execute('CREATE TABLE IF NOT EXISTS library_assets(id TEXT PRIMARY KEY,file TEXT NOT NULL,width INTEGER,height INTEGER,data BLOB NOT NULL)')
            yield db;db.commit()
        except (sqlite3.Error,OSError): raise HTTPException(503,'Library storage unavailable') from None
        finally:
            if db is not None: db.close()
    def state(self,db):
        row=db.execute('SELECT body FROM library_state WHERE id=1').fetchone()
        return json.loads(row[0]) if row else self.initial()
    def raw_asset(self,db,key):
        if key in PRESETS:
            raw=(Path(__file__).parent/'data/brand-library'/f'{key}.png').read_bytes()
            with Image.open(BytesIO(raw)) as im: w,h=im.size
            return {'id':key,'file':key+'.png','width':w,'height':h,'bytes':len(raw)},raw
        row=db.execute('SELECT file,width,height,data FROM library_assets WHERE id=?',(key,)).fetchone()
        if not row: raise HTTPException(404,'Logo not found')
        return {'id':key,'file':row[0],'width':row[1],'height':row[2],'bytes':len(row[3])},row[3]
    def expanded(self,db,content):
        return {**content,'assets':[{**self.raw_asset(db,a['asset_id'])[0],**a} for a in content['assets']]}
    def result(self,db,state,public=False):
        base={'published_version':state['published_version'],'published_at':state['published_at']}
        if public:return {**base,'content':self.expanded(db,state['published'])}
        return {**base,'revision':state['revision'],'draft':self.expanded(db,state['draft']),'published':self.expanded(db,state['published']),'available':[self.raw_asset(db,key)[0] for key in [*PRESETS,*[r[0] for r in db.execute('SELECT id FROM library_assets ORDER BY rowid DESC')]]]}
    def get(self,public=False):
        with self.transaction() as db:return self.result(db,self.state(db),public)
    def save(self,body):
        with self.transaction() as db:
            state=self.state(db)
            if state['revision']!=body.revision:raise HTTPException(409,'Library changed; reload before saving')
            for asset in body.content.assets:
                try:self.raw_asset(db,asset.asset_id)
                except HTTPException:raise HTTPException(422,'Unknown asset') from None
            state['draft']=body.content.model_dump();state['revision']+=1
            db.execute('INSERT INTO library_state VALUES(1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',(json.dumps(state,ensure_ascii=False),))
            return self.result(db,state)
    def publish(self,revision):
        with self.transaction() as db:
            state=self.state(db)
            if state['revision']!=revision:raise HTTPException(409,'Library changed; reload before publishing')
            if state['draft']==state['published']:raise HTTPException(409,'No draft changes to publish')
            state['published']=state['draft'];state['revision']+=1;state['published_version']+=1;state['published_at']=datetime.now(timezone.utc).isoformat()
            db.execute('INSERT INTO library_state VALUES(1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',(json.dumps(state,ensure_ascii=False),))
            return self.result(db,state)
    def upload(self,filename,encoded):
        if not re.fullmatch(r'[a-zA-Z0-9가-힣_. -]{1,96}\.png',filename,re.I) or '..' in filename:raise HTTPException(422,'Use a simple PNG filename')
        try: raw=base64.b64decode(encoded,validate=True)
        except (ValueError,binascii.Error):raise HTTPException(422,'Invalid encoding') from None
        if not raw or len(raw)>2*1024*1024:raise HTTPException(422,'PNG must be 2 MiB or smaller')
        try:
            with Image.open(BytesIO(raw)) as im:
                w,h=im.size
                if im.format!='PNG' or getattr(im,'n_frames',1)!=1 or max(w,h)>4096 or w*h>16000000:raise ValueError()
                im.verify()
        except Exception:raise HTTPException(422,'Invalid PNG or dimensions') from None
        key=str(uuid4())
        with self.transaction() as db:
            db.execute('INSERT INTO library_assets VALUES(?,?,?,?,?)',(key,filename,w,h,raw))
        return {'id':key,'file':filename,'width':w,'height':h,'bytes':len(raw)}
    def asset(self,key,public=False,download=False):
        with self.transaction() as db:
            if public and key not in {a['asset_id'] for a in self.state(db)['published']['assets']}:raise HTTPException(404,'Logo not published')
            info,raw=self.raw_asset(db,key)
            from urllib.parse import quote
            return Response(raw,media_type='image/png',headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':('attachment' if download else 'inline')+"; filename*=UTF-8''"+quote(info['file'])})

def register_brand_library_routes(app,catalog,require_admin,path):
    store=LibraryStore(path);factory=FactoryStore(catalog)
    def require_factory(authorization:str|None=Header(default=None)):
        scheme,_,token=(authorization or '').partition(' ')
        if scheme.lower()!='bearer' or not token:raise HTTPException(401,'Factory login required')
        factory.profile(token)
    admin='/api/v1/admin/brand-library';public='/api/v1/factory/brand-library'
    @app.get(admin,dependencies=[Depends(require_admin)])
    def get_admin(response:Response):
        response.headers['Cache-Control']='no-store';return store.get()
    @app.put(admin,dependencies=[Depends(require_admin)])
    def save(body:LibraryUpdate):return store.save(body)
    @app.post(admin+'/publish',dependencies=[Depends(require_admin)])
    def publish(body:Revision):return store.publish(body.revision)
    @app.post(admin+'/assets',dependencies=[Depends(require_admin)],status_code=201)
    async def upload(request:Request):
        raw=bytearray()
        async for chunk in request.stream():
            if len(raw)+len(chunk)>3*1024*1024:raise HTTPException(413,'Upload too large')
            raw.extend(chunk)
        try:body=Upload.model_validate_json(raw)
        except ValidationError:raise HTTPException(422,'Invalid upload') from None
        return await run_in_threadpool(store.upload,body.filename,body.content_base64)
    @app.get(admin+'/assets/{key}',dependencies=[Depends(require_admin)])
    def admin_asset(key:str,download:bool=False):return store.asset(key,download=download)
    @app.get(public,dependencies=[Depends(require_factory)])
    def get_factory(response:Response):
        response.headers['Cache-Control']='no-store';return store.get(True)
    @app.get(public+'/assets/{key}',dependencies=[Depends(require_factory)])
    def factory_asset(key:str,download:bool=False):return store.asset(key,True,download)
