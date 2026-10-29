"""Atomic SQLite design versions and receipts; no catalogue access."""
import base64
import binascii
import hashlib
import io
import json
import sqlite3
import warnings
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from .models import initial_document

def canonical(value): return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)
def now(): return datetime.now(timezone.utc).isoformat()

def asset_layers(doc):
    layers = list(doc['decorations'])
    if doc.get('studio'):
        layers.extend(d for d in doc['studio']['designs'] if d.get('asset_id'))
    return layers

class DesignStore:
    def __init__(self,path:Path):
        self.path=path

    @contextmanager
    def connection(self,write=False):
        # Lazy initialization keeps unrelated application tests from opening this DB.
        self.path.parent.mkdir(parents=True,exist_ok=True)
        db=sqlite3.connect(self.path,timeout=15)
        db.row_factory=sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        try:
            self.ensure_schema(db)
            db.execute('BEGIN IMMEDIATE' if write else 'BEGIN')
            yield db
            db.commit()
        except BaseException:
            db.rollback(); raise
        finally: db.close()

    def ensure_schema(self, db):
        # SQLite's write reservation serializes migration between processes too.
        # Never use executescript here: it would commit the reservation early.
        db.execute('BEGIN IMMEDIATE')
        version = db.execute('PRAGMA user_version').fetchone()[0]
        if version == 1:
            db.commit()
            return
        if version != 0:
            raise HTTPException(503, 'Unsupported design database version. Use a compatible application; this database was not modified.')
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")}
        statements = (
            'CREATE TABLE projects(id TEXT PRIMARY KEY, created_at TEXT NOT NULL, latest INTEGER NOT NULL)',
            'CREATE TABLE versions(project_id TEXT NOT NULL REFERENCES projects(id), version INTEGER NOT NULL, name TEXT NOT NULL, document TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(project_id,version))',
            'CREATE TABLE assets(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), mime TEXT NOT NULL, content BLOB NOT NULL)',
            'CREATE TABLE receipts(request_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL)',
            'CREATE INDEX design_assets_project ON assets(project_id)',
        )
        if tables:
            expected_columns = {
                'projects': [('id', 'TEXT', 0, 1), ('created_at', 'TEXT', 1, 0), ('latest', 'INTEGER', 1, 0)],
                'versions': [('project_id', 'TEXT', 1, 1), ('version', 'INTEGER', 1, 2), ('name', 'TEXT', 1, 0), ('document', 'TEXT', 1, 0), ('updated_at', 'TEXT', 1, 0)],
                'assets': [('id', 'TEXT', 0, 1), ('project_id', 'TEXT', 1, 0), ('mime', 'TEXT', 1, 0), ('content', 'BLOB', 1, 0)],
                'receipts': [('request_id', 'TEXT', 0, 1), ('fingerprint', 'TEXT', 1, 0), ('result', 'TEXT', 1, 0)],
            }
            if tables != set(expected_columns):
                raise HTTPException(503, 'Unrecognized legacy design database schema; no migration performed.')
            for table, columns in expected_columns.items():
                actual = [(row['name'], row['type'], row['notnull'], row['pk']) for row in db.execute(f'PRAGMA table_info({table})')]
                if actual != columns:
                    raise HTTPException(503, 'Unrecognized legacy design database schema; no migration performed.')
            backup_path = self.path.with_name(f'{self.path.name}.backup-{uuid4()}.sqlite3')
            # A separate read connection sees the committed pre-migration state
            # while this connection prevents other writers changing that state.
            with sqlite3.connect(self.path) as source:
                with sqlite3.connect(backup_path) as backup:
                    source.backup(backup)
        else:
            for statement in statements:
                db.execute(statement)
        db.execute('PRAGMA user_version=1')
        db.commit()

    def record(self,db,p):
        row=db.execute('SELECT p.id,p.created_at,v.version,v.name,v.document,v.updated_at FROM projects p JOIN versions v ON v.project_id=p.id AND v.version=p.latest WHERE p.id=?',(p,)).fetchone()
        if row is None: raise HTTPException(404,'Design not found.')
        result=dict(row);result['document']=json.loads(result['document'])
        result['assets']=[dict(v) for v in db.execute('SELECT id,mime,length(content) AS bytes FROM assets WHERE project_id=? ORDER BY rowid',(p,))]
        return result

    def mutate(self,operation,body,fn):
        data=body.model_dump(mode='json')
        fingerprint=hashlib.sha256(canonical([operation,data]).encode()).hexdigest()
        with self.connection(True) as db:
            previous=db.execute('SELECT fingerprint,result FROM receipts WHERE request_id=?',(body.request_id,)).fetchone()
            if previous:
                if previous['fingerprint']!=fingerprint: raise HTTPException(409,'Request ID was already used with a different payload.')
                return json.loads(previous['result'])
            result=fn(db)
            db.execute('INSERT INTO receipts VALUES(?,?,?)',(body.request_id,fingerprint,canonical(result)))
            return result

    def insert_project(self,db,name,doc):
        p=str(uuid4());timestamp=now()
        db.execute('INSERT INTO projects VALUES(?,?,1)',(p,timestamp))
        db.execute('INSERT INTO versions VALUES(?,1,?,?,?)',(p,name,canonical(doc),timestamp))
        return p

    def create(self,body):
        return self.mutate('create',body,lambda db:self.record(db,self.insert_project(db,body.name,initial_document(body.template_id))))

    def get(self,p):
        with self.connection() as db:return self.record(db,p)

    def list(self,page,size,q):
        with self.connection() as db:
            condition='FROM projects p JOIN versions v ON v.project_id=p.id AND v.version=p.latest WHERE instr(lower(v.name),lower(?))>0'
            total=db.execute('SELECT count(*) '+condition,(q,)).fetchone()[0]
            ids=db.execute('SELECT p.id '+condition+' ORDER BY v.updated_at DESC,p.id LIMIT ? OFFSET ?',(q,size,(page-1)*size)).fetchall()
            return dict(items=[self.record(db,r['id']) for r in ids],total=total,page=page,size=size)

    def check_document(self,db,p,doc,old):
        studio_switch = doc['schema_version'] == 2 and old['document']['schema_version'] == 2
        if not studio_switch and (doc['template_id'],doc['template_version']) != (old['document']['template_id'],old['document']['template_version']):
            raise HTTPException(422,'Template cannot be changed on an existing design.')
        for a in {d['asset_id'] for d in asset_layers(doc)}:
            if not db.execute('SELECT 1 FROM assets WHERE id=? AND project_id=?',(a,p)).fetchone():
                raise HTTPException(422,'A referenced image does not belong to this design.')

    def update(self,p,body):
        def run(db):
            old=self.record(db,p)
            if old['version']!=body.base_version:raise HTTPException(409,'The design was changed. Reload or save a copy.')
            doc=body.document.model_dump(exclude_unset=True);self.check_document(db,p,doc,old)
            version=old['version']+1
            db.execute('INSERT INTO versions VALUES(?,?,?,?,?)',(p,version,body.name,canonical(doc),now()))
            db.execute('UPDATE projects SET latest=? WHERE id=?',(version,p))
            return self.record(db,p)
        return self.mutate('update:'+p,body,run)

    def copy(self,p,body):
        def run(db):
            old=self.record(db,p);doc=body.document.model_dump(exclude_unset=True);self.check_document(db,p,doc,old)
            mapping={a:str(uuid4()) for a in {d['asset_id'] for d in asset_layers(doc)}}
            for d in asset_layers(doc):d['asset_id']=mapping[d['asset_id']]
            target=self.insert_project(db,body.name,doc)
            for source,dest in mapping.items():
                db.execute('INSERT INTO assets SELECT ?,?,mime,content FROM assets WHERE id=? AND project_id=?',(dest,target,source,p))
            return self.record(db,target)
        return self.mutate('copy:'+p,body,run)

    def upload(self,p,body):
        def run(db):
            self.record(db,p)
            count,total=db.execute('SELECT count(*),coalesce(sum(length(content)),0) FROM assets WHERE project_id=?',(p,)).fetchone()
            if count>=40:raise HTTPException(422,'This design has reached its 40 image limit.')
            content=clean_image(body.data_url)
            if total+len(content)>40*1024*1024:raise HTTPException(422,'This design has reached its 40 MiB image limit.')
            a=str(uuid4());db.execute('INSERT INTO assets VALUES(?,?,?,?)',(a,p,'image/png',content))
            return dict(id=a,mime='image/png',bytes=len(content))
        return self.mutate('asset:'+p,body,run)

    def asset(self,p,a):
        with self.connection() as db:
            row=db.execute('SELECT mime,content FROM assets WHERE id=? AND project_id=?',(a,p)).fetchone()
            if row is None:raise HTTPException(404,'Image not found.')
            return row['content'],row['mime']

def clean_image(url):
    try:
        header,encoded=url.split(',',1)
        formats={'data:image/png;base64':'PNG','data:image/jpeg;base64':'JPEG','data:image/webp;base64':'WEBP'}
        if header not in formats:raise ValueError()
        raw=base64.b64decode(encoded,validate=True)
        if not raw or len(raw)>2*1024*1024:raise ValueError()
        with warnings.catch_warnings():
            warnings.simplefilter('error',Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(raw)) as img:
                if img.format!=formats[header] or getattr(img,'n_frames',1)!=1:raise ValueError()
                width,height=img.size
                if max(width,height)>4096 or width*height>16_000_000:raise ValueError()
                img.load()
                # Rebuild solely from pixel bytes; metadata, EXIF and trailing data never survive.
                mode='RGBA' if 'A' in img.getbands() or 'transparency' in img.info else 'RGB'
                pixels=img.convert(mode)
                clean=Image.frombytes(mode,pixels.size,pixels.tobytes())
                output=io.BytesIO();clean.save(output,format='PNG')
                content = output.getvalue()
                if len(content) > 2 * 1024 * 1024:
                    raise ValueError('Sanitized image exceeds the download limit.')
                return content
    except (ValueError,binascii.Error,OSError,UnidentifiedImageError,Image.DecompressionBombError,Image.DecompressionBombWarning) as exc:
        raise HTTPException(422,'Upload a single-frame PNG, JPEG or WebP image up to 2 MiB before and after PNG conversion, 4096 pixels per side and 16 megapixels.') from exc
