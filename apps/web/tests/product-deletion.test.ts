import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogRequest, parseProductDeletion } from '../src/lib/catalog.ts';

test('deletion requires explicit server confirmation and strips unrelated fields', () => {
  assert.deepEqual(parseProductDeletion({id:'product-1',deleted:true,private_note:'ignored'}),{id:'product-1',deleted:true});
  for(const value of [null,{}, {id:'product-1',deleted:false}, {id:'product-1',deleted:'true'}, {id:'',deleted:true}]) {
    assert.throws(()=>parseProductDeletion(value));
  }
});

test('delete sends version and does not treat failures or malformed success as deletion', async () => {
  let sent: RequestInit | undefined;
  const result=await catalogRequest('/api/admin/products/product-1',parseProductDeletion,{method:'DELETE',body:{version:3},fetcher:async (_url,options)=>{sent=options;return Response.json({id:'product-1',deleted:true});}});
  assert.deepEqual(result,{ok:true,data:{id:'product-1',deleted:true}});
  assert.equal(sent?.method,'DELETE');assert.equal(sent?.credentials,'same-origin');assert.equal(sent?.body,JSON.stringify({version:3}));
  for(const [status,reason] of [[401,'auth'],[404,'missing'],[409,'conflict'],[422,'validation'],[503,'unavailable']] as const){
    assert.deepEqual(await catalogRequest('/x',parseProductDeletion,{method:'DELETE',body:{version:3},fetcher:async()=>Response.json({}, {status})}),{ok:false,reason});
  }
  assert.deepEqual(await catalogRequest('/x',parseProductDeletion,{method:'DELETE',fetcher:async()=>Response.json({id:'product-1'})}),{ok:false,reason:'unavailable'});
});
