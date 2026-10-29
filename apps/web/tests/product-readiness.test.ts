import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProductReadiness} from '../src/lib/catalog.ts';

test('readiness accepts all server states with counts and strips unrelated fields',()=>{
 const rows=[{product_id:'a',status:'no_options',sku_count:0,stocked_sku_count:0,total_on_hand:0},
 {product_id:'b',status:'no_stock',sku_count:2,stocked_sku_count:0,total_on_hand:0},
 {product_id:'c',status:'partial_stock',sku_count:2,stocked_sku_count:1,total_on_hand:5},
 {product_id:'d',status:'in_stock',sku_count:2,stocked_sku_count:2,total_on_hand:5}];
 assert.deepEqual(parseProductReadiness(rows.map(r=>({...r,secret:'ignored'})),['a','b','c','d']),rows);
});
test('readiness rejects missing, duplicate, foreign and contradictory server summaries',()=>{
 const valid={product_id:'a',status:'in_stock',sku_count:2,stocked_sku_count:2,total_on_hand:5};
 for(const rows of [null,[],[valid,valid],[{...valid,product_id:'x'}],[{...valid,status:'published'}],[{...valid,stocked_sku_count:3}],[{...valid,total_on_hand:0}],[{...valid,sku_count:true}],[{...valid,status:'no_stock'}]])assert.throws(()=>parseProductReadiness(rows,['a']));
});
