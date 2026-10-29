"""Authenticated bounded request parsing before JSON or image decoding."""
import json
from pathlib import Path
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool
from .models import CreateRequest,UpdateRequest,CopyRequest,AssetRequest,TEMPLATES,MATERIALS
from .store import DesignStore

async def parse(request,model,limit=256*1024):
    try:
        length=request.headers.get('content-length')
        if length is not None and int(length)>limit:raise HTTPException(413,'Request body is too large.')
        if length is not None and int(length)<0:raise ValueError()
        data=bytearray()
        async for chunk in request.stream():
            if len(data)+len(chunk)>limit:raise HTTPException(413,'Request body is too large.')
            data.extend(chunk)
        def invalid_constant(value):raise ValueError('Non-finite number')
        value=json.loads(data,parse_constant=invalid_constant)
        return model.model_validate(value)
    except (ValueError,ValidationError,UnicodeDecodeError,RecursionError) as exc:
        raise HTTPException(422,'Invalid design request. Check required fields, supported versions and print bounds.') from exc

def register_design_routes(application,require_admin,db_path:Path):
    store=DesignStore(db_path)
    router=APIRouter(prefix='/api/v1/admin/designs',dependencies=[Depends(require_admin)])
    @router.get('/templates')
    def templates():return {'templates':TEMPLATES}
    @router.get('/materials')
    def materials():return {'materials':MATERIALS}
    @router.get('')
    def listing(page:int=Query(1,ge=1,le=1000000),size:int=Query(20),q:str=Query('',max_length=120)):
        if size not in (10,20,50,100):raise HTTPException(422,'Page size must be 10, 20, 50 or 100.')
        return store.list(page,size,q)
    @router.post('',status_code=201)
    async def create(request:Request):return await run_in_threadpool(store.create,await parse(request,CreateRequest))
    @router.get('/{project_id}')
    def get(project_id:UUID):return store.get(str(project_id))
    @router.patch('/{project_id}')
    async def update(project_id:UUID,request:Request):return await run_in_threadpool(store.update,str(project_id),await parse(request,UpdateRequest))
    @router.post('/{project_id}/copies',status_code=201)
    async def copy(project_id:UUID,request:Request):return await run_in_threadpool(store.copy,str(project_id),await parse(request,CopyRequest))
    @router.post('/{project_id}/assets',status_code=201)
    async def upload(project_id:UUID,request:Request):return await run_in_threadpool(store.upload,str(project_id),await parse(request,AssetRequest,3*1024*1024))
    @router.get('/{project_id}/assets/{asset_id}')
    def asset(project_id:UUID,asset_id:UUID):
        content,mime=store.asset(str(project_id),str(asset_id))
        return Response(content,media_type=mime,headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'})
    application.include_router(router)
