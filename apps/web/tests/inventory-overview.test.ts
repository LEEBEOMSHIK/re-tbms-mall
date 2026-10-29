import test from 'node:test';
import assert from 'node:assert/strict';
import {parseInventoryOverview,requestInventoryOverview,stockFilter,stockMatches,stockHref} from '../src/lib/inventory-overview.ts';
const row={id:'s',product_id:'p',product_name:'Shirt',internal_name:'TOP-1',code:'TOP-1-B-M',color:'Black',size:'M',on_hand:2,reorder_point:2,is_active:false};
const fixture={mode:'local',as_of:'2026-10-28T01:00:00Z',total_on_hand:2,option_count:1,low_stock_count:1,low_stock_preview:[row]};
test('authoritative actual snapshot includes inactive and equal-boundary stock without reserved/available invention',()=>{
 const data=parseInventoryOverview({...fixture,secret:'ignored'});
 assert.equal(data.total_on_hand,2);assert.deepEqual(data.low_stock_preview,[row]);assert(!('secret' in data));assert(!('available' in data.low_stock_preview[0]));
 assert.equal(parseInventoryOverview({...fixture,total_on_hand:0,option_count:0,low_stock_count:0,low_stock_preview:[]}).option_count,0);
});
test('rejects partial, malformed, synthetic and inconsistent snapshots rather than displaying zero',()=>{
 for(const value of [null,{}, {...fixture,mode:'sample'},{...fixture,total_on_hand:-1},{...fixture,as_of:'bad'}, {...fixture,low_stock_count:2},{...fixture,low_stock_preview:[]},{...fixture,low_stock_preview:[{...row,on_hand:3}]},{...fixture,low_stock_preview:[{...row,is_active:1}]}])assert.throws(()=>parseInventoryOverview(value));
});
test('all and low links select consistent boundary filters; invalid and repeated values never broaden the list',()=>{
 assert.equal(stockFilter(undefined),'all');assert.equal(stockFilter('all'),'all');assert.equal(stockFilter('low'),'low');
 for(const value of ['',[],['low'],'other'])assert.equal(stockFilter(value),'invalid');
 assert.equal(stockMatches(true,'low'),true);assert.equal(stockMatches(false,'low'),false);assert.equal(stockMatches(false,'all'),true);assert.equal(stockMatches(true,'invalid'),false);
 assert.equal(stockHref('low'),'/admin/catalog/inventory?stock=low');
});
test('real snapshot requests use no-store and classify auth/server/parse errors without stale fallback',async()=>{
 const result=await requestInventoryOverview({fetcher:async(url,init)=>{assert.equal(url,'/api/admin/inventory/overview');assert.equal(init?.cache,'no-store');assert.equal(init?.credentials,'same-origin');return Response.json(fixture);}});assert(result.ok);
 for(const [status,reason] of [[401,'auth'],[503,'unavailable']] as const)assert.deepEqual(await requestInventoryOverview({fetcher:async()=>new Response('',{status})}),{ok:false,reason});
 assert.deepEqual(await requestInventoryOverview({fetcher:async()=>Response.json({})}),{ok:false,reason:'unavailable'});
 assert.deepEqual(await requestInventoryOverview({fetcher:async()=>{throw Error('private');}}),{ok:false,reason:'unavailable'});
});
