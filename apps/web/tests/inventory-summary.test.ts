import test from 'node:test';
import assert from 'node:assert/strict';
import { inventorySummary, inventoryMatches, scopeInventoryCatalog, productStockSummary, inventoryProductFilter } from '../src/lib/inventory-summary.ts';
import type { Catalog, Movement } from '../src/lib/catalog.ts';

test('record totals separate receipt, sale, other and adjustment; legacy never inferred and SKU stock remains authoritative', () => {
  const codes = ['receipt', 'sale', 'gift', 'disposal', 'other_out', 'adjust_in', 'adjust_out', 'legacy', undefined] as const;
  const deltas = [20, -3, -2, -1, -4, 5, -2, 100, -50];
  const catalog: Catalog = { mode: 'local', categories: [], season_options: [], products: [{ id: 'p', name: '셔츠', internal_name: 'TOP-01', category_id: 'c', category: '상의', seasons: [], description: '', version: 0 }], skus: [{ is_active: true, id: 's', product_id: 'p', code: 'TOP-W-M', color: '화이트', size: 'M', on_hand: 2, reorder_point: 2, version: 9 }], movements: codes.map((reason_code, i): Movement => ({ id: String(i), sku_id: 's', reason_code, delta: deltas[i], reason: '', actor: 'local-admin', created_at: '2026-10-26T00:00:00Z', balance_after: 2, request_id: String(i) })) };
  const [row] = inventorySummary(catalog);
  assert.deepEqual([row.received, row.sold, row.otherOut, row.adjusted, row.current, row.low], [20, 3, 7, 3, 2, true]);
  assert.equal(inventoryMatches(row, ' top-01 '), true);
  assert.equal(inventoryMatches(row, '화이트'), true);
  assert.equal(inventoryMatches(row, '없는상품'), false);
});

test('empty store produces no invented stock rows', () => {
  assert.deepEqual(inventorySummary({ mode: 'local', categories: [], season_options: [], products: [], skus: [], movements: [] }), []);
});

test('product scope matches exact identity for stock and movements; unknown never expands to all',()=>{
 const product=(id:string)=>({id,name:id,internal_name:id,category_id:'c',category:'상의',seasons:[],description:'',version:0});
 const sku=(id:string,product_id:string,on_hand:number)=>({is_active:true,id,product_id,on_hand,code:id,color:'Black',size:'M',reorder_point:0,version:0});
 const catalog:Catalog={mode:'local',categories:[],season_options:[],products:[product('p1'),product('p10'),product('empty')],skus:[sku('s1','p1',3),sku('s2','p1',7),sku('s10','p10',100)],movements:[{id:'m1',sku_id:'s1',delta:20,reason:'',reason_code:'receipt',actor:'local-admin',created_at:'2026-10-26T00:00:00Z',balance_after:20,request_id:'r1'},{id:'m10',sku_id:'s10',delta:100,reason:'',reason_code:'receipt',actor:'local-admin',created_at:'2026-10-26T00:00:00Z',balance_after:100,request_id:'r10'}]};
 assert.equal(scopeInventoryCatalog(catalog,''),catalog);
 assert.deepEqual(productStockSummary(catalog,'p1'),{count:2,onHand:10});
 assert.deepEqual(productStockSummary(catalog,'empty'),{count:0,onHand:0});
 const scoped=scopeInventoryCatalog(catalog,'p1');
 assert.deepEqual(scoped.products.map(p=>p.id),['p1']);
 assert.deepEqual(scoped.skus.map(s=>s.id),['s1','s2']);
 assert.deepEqual(scoped.movements.map(m=>m.id),['m1']);
 assert.equal(inventorySummary(scoped).reduce((sum,row)=>sum+row.received,0),20);
 for(const id of ['missing','p','P1','empty']){
  const filtered=scopeInventoryCatalog(catalog,id);assert.equal(filtered.skus.length,0);assert.equal(filtered.movements.length,0);
 }
 assert.equal(catalog.skus.length,3);assert.equal(catalog.movements.length,2);
});
test('only omitted product filter selects all; empty or repeated query cannot silently broaden scope',()=>{
 assert.equal(inventoryProductFilter(undefined),'');assert.equal(inventoryProductFilter('p1'),'p1');
 for(const value of ['',[],['p1'],['p1','p2']])assert.notEqual(inventoryProductFilter(value),'');
});
