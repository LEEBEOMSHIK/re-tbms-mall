import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesignProxy } from '../src/lib/design-proxy-core.ts';
import { adminSection } from '../src/lib/admin-navigation.ts';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const request=(method='GET',body?:string,origin='http://127.0.0.1:3101')=>new Request('http://127.0.0.1:3101/api/admin/designs',{method,headers:{Origin:origin,'Content-Type':'application/json'},body});
test('design navigation selects the integrated admin section',()=>{
 assert.equal(adminSection('/admin/designs/'+id+'/edit'),'/admin/designs');
});
test('proxy denies missing session, foreign origin, traversal and unsupported methods before upstream',async()=>{
 let calls=0; const upstream=async()=>{calls++;return Response.json({ok:true});};
 const anonymous=createDesignProxy({session:async()=>null,base:()=> 'http://api',fetcher:upstream});
 assert.equal((await anonymous(request(),[])).status,401);
 const proxy=createDesignProxy({session:async()=>({token:'synthetic'}),base:()=> 'http://api',fetcher:upstream});
 assert.equal((await proxy(request('POST','{}','http://evil.test'),[])).status,403);
 assert.equal((await proxy(request(),['..','storefront'])).status,404);
 assert.equal((await proxy(request('DELETE'),[id])).status,405);
 assert.equal(calls,0);
});
test('proxy bounds streamed bodies, including no content length and UTF-8 byte lengths',async()=>{
 let calls=0;
 const proxy=createDesignProxy({session:async()=>({token:'synthetic'}),base:()=> 'http://api',fetcher:async()=>{calls++;return Response.json({});}});
 assert.equal((await proxy(request('PATCH','"'+'한'.repeat(90000)+'"'),[id])).status,413);
 assert.equal((await proxy(request('POST','bad json'),[])).status,422);
 assert.equal(calls,0);
});
test('proxy forwards only authorized paths and passes conflict and binary assets without leaking token',async()=>{
 const proxy=createDesignProxy({session:async()=>({token:'synthetic'}),base:()=> 'http://api',fetcher:async(url,init)=>{
  assert.match(String(url),new RegExp('/api/v1/admin/designs/'+id+'/assets/'+id+'$'));
  assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer synthetic');
  return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}});
 }});
 const image=await proxy(request(),[id,'assets',id]);
 assert.equal(image.headers.get('Content-Type'),'image/png');assert.equal(image.headers.get('Cache-Control'),'no-store');
 assert.deepEqual([...new Uint8Array(await image.arrayBuffer())],[1,2,3]);
 const conflict=createDesignProxy({session:async()=>({token:'synthetic'}),base:()=> 'http://api',fetcher:async()=>Response.json({detail:'version conflict'},{status:409})});
 assert.equal((await conflict(request('PATCH','{}'),[id])).status,409);
 const outage=createDesignProxy({session:async()=>({token:'synthetic'}),base:()=> 'http://api',fetcher:async()=>{throw Error('secret');}});
 assert.equal((await outage(request(),[])).status,503);
});
