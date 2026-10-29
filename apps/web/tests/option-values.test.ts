import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOptionValue,parseSku,catalogRequest} from '../src/lib/catalog.ts';
const value={id:'color-1',kind:'color',name:'검정',code:'BLK',is_active:true,sort_order:0,version:0};
test('option value contract validates domain kind, stable code and strict edit metadata',()=>{
 assert.deepEqual(parseOptionValue({...value,secret:'ignored'}),value);
 for(const patch of [{kind:'fabric'},{code:'black'},{code:'A-B'},{code:''},{name:''},{is_active:'true'},{sort_order:-1},{sort_order:10001},{version:true}])assert.throws(()=>parseOptionValue({...value,...patch}));
});
test('SKU references preserve legacy snapshots and require complete ID pairs',()=>{
 const sku={id:'s',product_id:'p',code:'LEGACY',color:'이전 검정',size:'M',reorder_point:0,on_hand:3,version:2};
 assert.deepEqual(parseSku(sku),{...sku,is_active:true});
 assert.deepEqual(parseSku({...sku,color_id:'c',size_id:'z'}),{...sku,is_active:true,color_id:'c',size_id:'z'});
 assert.throws(()=>parseSku({...sku,color_id:'c'}));
});
test('domain creation parses confirmed server values and rejects malformed success',async()=>{
 assert.deepEqual(await catalogRequest('/api/admin/option-values',parseOptionValue,{method:'POST',body:value,fetcher:async()=>Response.json(value,{status:201})}),{ok:true,data:value});
 assert.deepEqual(await catalogRequest('/x',parseOptionValue,{method:'POST',fetcher:async()=>Response.json({...value,kind:'unknown'})}),{ok:false,reason:'unavailable'});
});
