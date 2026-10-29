import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSkuBatch} from '../src/lib/catalog.ts';
const sku={id:'s1',product_id:'p',color_id:'c',size_id:'m',code:'P-C-M',color:'Black',size:'M',reorder_point:2,on_hand:0,version:0};
const request={product_id:'p',color_ids:['c'],size_ids:['m','l'],reorder_point:2};
const second={...sku,id:'s2',size_id:'l',size:'L',code:'P-C-L',on_hand:8,version:3};
test('batch confirms exact requested combinations and preserves existing stock',()=>{
 assert.equal(parseSkuBatch({created:[sku],existing:[second]},request).existing[0].on_hand,8);
 assert.equal(parseSkuBatch({created:[],existing:[sku,second]},request).created.length,0);
});
test('batch rejects duplicate, incomplete, foreign and malformed success responses',()=>{
 for(const body of [{created:[sku],existing:[]},{created:[sku],existing:[sku]},{created:[{...sku,on_hand:1}],existing:[second]},{created:[{...sku,product_id:'other'}],existing:[second]},{created:[{...sku,color_id:undefined,size_id:undefined}],existing:[second]},{created:[{...sku,reorder_point:8}],existing:[second]},{created:[],existing:[]}])assert.throws(()=>parseSkuBatch(body,request));
});
