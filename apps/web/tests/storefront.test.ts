import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStorefront, visibleSections, moveItem, requestStorefront } from '../src/lib/storefront.ts';
test('hero slides retain automatic, empty and explicit modes and validate stored slide data',()=>{
  const state={revision:1,categories:[],products:[],sections:[]};
  const slide={id:'top-1',section_id:'tops',product_id:'p1',title:'겨울 셔츠',subtitle:'',enabled:true};
  assert.equal(parseStorefront(state).hero_slides,null);
  assert.equal(parseStorefront({...state,hero_slides:null}).hero_slides,null);
  assert.deepEqual(parseStorefront({...state,hero_slides:[]}).hero_slides,[]);
  assert.deepEqual(parseStorefront({...state,hero_slides:[slide]}).hero_slides,[slide]);
  for(const invalid of [false,[slide,slide],[{...slide,title:' '}],[{...slide,id:'../x'}],[{...slide,enabled:0}]])assert.throws(()=>parseStorefront({...state,hero_slides:invalid}));
});
test('hero visibility defaults for older responses and preserves false across the save proxy', async () => {
  const state = {revision:2, categories:[], products:[], sections:[]};
  assert.equal(parseStorefront(state).hero_enabled, true);
  for (const value of [null, 'false', 0]) assert.throws(() => parseStorefront({...state, hero_enabled:value}));
  const result = await requestStorefront({admin:true, save:{revision:2, sections:[], hero_enabled:false}, fetcher:async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).hero_enabled, false);
    return Response.json({...state, revision:3, hero_enabled:false});
  }});
  assert.equal(result.ok && result.data.revision === 3 && result.data.hero_enabled === false, true);
});
const data = { revision: 0, categories: [{id:'tops',name:'상의'},{id:'outer',name:'아우터'}], products: [{review_summary:{average_rating:null,review_count:0},id:'p001',name:'셔츠',category_id:'tops',price:39000,discount_price:null,effective_price:39000,discount_rate:null,image:'/api/v1/products/p001/images/i1',sold_out:false,options:[{id:'s1',color:'화이트',size:'M',available:true}],images:[{id:'i1',kind:'garment',name:'셔츠',alt:'',url:'/api/v1/products/p001/images/i1'}],color:'화이트',description:'샘플'}, {review_summary:{average_rating:null,review_count:0},id:'p004',name:'코트',category_id:'outer',price:89000,discount_price:null,effective_price:89000,discount_rate:null,image:'/api/v1/products/p004/images/i4',sold_out:false,options:[{id:'s4',color:'베이지',size:'M',available:true}],images:[{id:'i4',kind:'model',name:'코트',alt:'',url:'/api/v1/products/p004/images/i4'}],color:'베이지',description:'샘플'}], sections: [{id:'a',title:'가을',subtitle:'',kind:'collection',enabled:true,product_ids:['p004','p001']},{id:'b',title:'숨김',subtitle:'',kind:'category',enabled:false,product_ids:['p001']}] };
test('validates complete contract and rejects broken relations or unsafe images',()=>{ assert.equal(parseStorefront(data).revision,0); for(const broken of [null, {...data,revision:-1},{...data, products:[{...data.products[0],price:1.5}]},{...data, products:[{...data.products[0],image:'https://untrusted.test/a'}]}, {...data,sections:[{...data.sections[0],product_ids:['missing']}]}]) assert.throws(()=>parseStorefront(broken)); });
test('filters inside ordered sections and omits hidden and empty sections',()=>{const valid=parseStorefront(data); assert.deepEqual(visibleSections(valid,'tops').map(s=>s.products.map(p=>p.id)),[['p001']]); assert.deepEqual(visibleSections(valid,'all')[0].products.map(p=>p.id),['p004','p001']); assert.deepEqual(visibleSections(valid,'dresses'),[]);});
test('reorders without mutating input and leaves boundaries intact',()=>{const list=['a','b','c']; assert.deepEqual(moveItem(list,1,-1),['b','a','c']); assert.deepEqual(moveItem(list,0,-1),list); assert.deepEqual(list,['a','b','c']);});
test('admin save uses same-origin session proxy and revision without bearer',async()=>{const result=await requestStorefront({admin:true,save:{revision:0,sections:parseStorefront(data).sections},fetcher:async(url,init)=>{assert.match(String(url),/admin\/storefront$/);assert.equal(init?.method,'PUT'); assert.equal(String(url),'/api/admin/storefront');assert.equal(new Headers(init?.headers).get('Authorization'),null);assert.equal(init?.credentials,'same-origin');assert.equal(JSON.parse(String(init?.body)).revision,0);assert.equal(init?.cache,'no-store');return Response.json(data);}});assert.equal(result.ok,true);});
test('normalizes auth, conflict, validation and unavailability without exposing diagnostics',async()=>{for(const [status,reason] of [[401,'auth'],[409,'conflict'],[422,'validation'],[503,'unavailable']] as const){assert.deepEqual(await requestStorefront({admin:true,fetcher:async()=>new Response('private diagnostic',{status})}),{ok:false,reason});}assert.deepEqual(await requestStorefront({fetcher:async()=>Response.json({})}),{ok:false,reason:'invalid-response'});assert.deepEqual(await requestStorefront({fetcher:async()=>{throw Error('private');}}),{ok:false,reason:'unavailable'});});
