import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSelectedSkuBatch} from '../src/lib/catalog.ts';
const sku={id:'s',product_id:'p',color_id:'c',size_id:'m',code:'P-C-M',color:'Black',size:'M',reorder_point:2,on_hand:5,version:1};
const request={product_id:'p',items:[{color_id:'c',size_id:'m',initial_stock:5}],reorder_point:2};
test('selected batch confirms exact initial stock while allowing existing stock unchanged',()=>{
 assert.equal(parseSelectedSkuBatch({created:[sku],existing:[]},request).created[0].on_hand,5);
 assert.equal(parseSelectedSkuBatch({created:[],existing:[{...sku,on_hand:9,version:4}]},request).existing[0].on_hand,9);
 assert.equal(parseSelectedSkuBatch({created:[{...sku,on_hand:0,version:0}],existing:[]},{...request,items:[{...request.items[0],initial_stock:0}]}).created[0].on_hand,0);
});
test('selected batch rejects wrong amount, version, unwanted combinations and incomplete confirmation',()=>{
 for(const body of [{created:[{...sku,on_hand:4}],existing:[]},{created:[{...sku,version:0}],existing:[]},{created:[{...sku,size_id:'l'}],existing:[]},{created:[sku],existing:[sku]},{created:[],existing:[]}])assert.throws(()=>parseSelectedSkuBatch(body,request));
});

test('maximum UUID payload fits selected route bound and exceeds ordinary request bound',()=>{
 const payload={product_id:'00000000-0000-4000-8000-000000000000',items:Array.from({length:200},(_,i)=>({color_id:`00000000-0000-4000-8000-${String(Math.floor(i/20)).padStart(12,'0')}`,size_id:`00000000-0000-4001-8000-${String(i%20).padStart(12,'0')}`,initial_stock:1000000})),reorder_point:1000000};
 const size=JSON.stringify(payload).length;assert(size>16384);assert(size<65536);
});

test('individual thresholds override common fallback including zero',()=>{
 const row={...sku,id:'second',size_id:'l',code:'P-C-L',reorder_point:0};
 const payload={product_id:'p',items:[{color_id:'c',size_id:'m',initial_stock:5,reorder_point:2},{color_id:'c',size_id:'l',initial_stock:5,reorder_point:0}],reorder_point:8};
 assert.equal(parseSelectedSkuBatch({created:[sku,row],existing:[]},payload).created[1].reorder_point,0);
 assert.throws(()=>parseSelectedSkuBatch({created:[sku,{...row,reorder_point:8}],existing:[]},payload));
 assert.equal(parseSelectedSkuBatch({created:[{...sku,reorder_point:0}],existing:[]},{product_id:'p',items:[{color_id:'c',size_id:'m',initial_stock:5}]}).created[0].reorder_point,0);
});
