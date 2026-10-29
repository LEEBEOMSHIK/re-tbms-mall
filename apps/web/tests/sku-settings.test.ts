import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSku} from '../src/lib/catalog.ts';
const sku={id:'s',product_id:'p',code:'TOP-S',color:'검정',size:'S',reorder_point:2,on_hand:9,version:0};
test('SKU preserves explicit usage flag and defaults legacy payload to active',()=>{
 assert.equal(parseSku(sku).is_active,true);
 assert.equal(parseSku({...sku,is_active:false}).is_active,false);
 assert.equal(parseSku({...sku,is_active:true}).is_active,true);
 for(const is_active of [0,1,'false',null])assert.throws(()=>parseSku({...sku,is_active}));
 assert.equal(parseSku({...sku,is_active:false}).on_hand,9);
});
