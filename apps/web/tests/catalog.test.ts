import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCatalog,parseProduct,parseMovement,catalogRequest,movementRequest,toggleSeason,internalNamePreview,categoryPath} from '../src/lib/catalog.ts';

const categories=[{id:'tops',name:'상의',code:'TOP',parent_id:null,is_active:true,sort_order:0,version:0}];
const season_options=[{code:'SP',label:'봄'},{code:'SU',label:'여름'},{code:'FA',label:'가을'},{code:'WI',label:'겨울'},{code:'ALL',label:'사계절'}];
const product={id:'p1',name:'셔츠',internal_name:'TOP-000001',category_id:'tops',category:'상의',seasons:[],description:'',version:0};
const sku={id:'s1',product_id:'p1',code:'SHIRT-W-M',color:'화이트',size:'M',reorder_point:2,on_hand:4,version:1};
test('catalog parser accepts an empty local store and rejects broken SKU ownership',()=>{
  assert.deepEqual(parseCatalog({mode:'local',season_options,categories,products:[],skus:[],movements:[]}),{mode:'local',season_options,categories,products:[],skus:[],movements:[]});
  assert.throws(()=>parseCatalog({mode:'local',season_options,categories,products:[],skus:[sku],movements:[]}));
  assert.throws(()=>parseCatalog({mode:'demo',season_options,categories,products:[],skus:[],movements:[]}));
  const parsed=parseCatalog({mode:'local',season_options,categories,products:[{...product,secret:'hidden'}],skus:[sku],movements:[]});
  assert.equal('secret' in parsed.products[0],false);
  assert.throws(()=>parseCatalog({mode:'local',season_options,categories,products:[product],skus:[{...sku,on_hand:-1}],movements:[]}));
});
test('movement parser refuses invalid zero deltas and invalid dates',()=>{
  const movement={id:'m1',sku_id:'s1',delta:4,reason:'입고',actor:'local-admin',created_at:'2026-10-26T01:00:00Z',balance_after:4,request_id:'r1'};
  assert.equal(parseMovement(movement).balance_after,4);
  assert.throws(()=>parseMovement({...movement,delta:0}));
  assert.throws(()=>parseMovement({...movement,created_at:'yesterday'}));
});
test('product contracts require server identity and registered category while preserving customer display names',()=>{
  const parsed=parseProduct({...product,private_note:'not exposed'});
  assert.equal(parsed.name,'셔츠');
  assert.equal(parsed.internal_name,'TOP-000001');
  assert.equal(parsed.category_id,'tops');
  assert.equal('private_note' in parsed,false);
  assert.throws(()=>parseProduct({...product,internal_name:undefined}));
  assert.throws(()=>parseProduct({...product,category_id:''}));
  assert.throws(()=>parseCatalog({mode:'local',season_options,categories,products:[{...product,category_id:'unregistered'}],skus:[],movements:[]}));
  assert.throws(()=>parseCatalog({mode:'local',season_options,categories,products:[{...product,category:'wrong label'}],skus:[],movements:[]}));
  assert.throws(()=>parseCatalog({mode:'local',season_options,categories:[...categories,{...categories[0],id:'tops2',name:'다른 분류',code:'TOP'}],products:[],skus:[],movements:[]}));
  assert.throws(()=>parseCatalog({mode:'local',season_options,categories,products:[product,{...product,id:'p2'}],skus:[],movements:[]}));
});
test('legacy categories and immutable management names do not assume current category prefixes',()=>{
  const legacyCategory={...categories[0],id:'legacy-001',name:'이전 사용자 분류',code:'LEG001'};
  const legacyProduct={...product,category_id:'legacy-001',category:legacyCategory.name,internal_name:'LEG001-000001'};
  const parsed=parseCatalog({mode:'local',season_options,categories:[...categories,legacyCategory],products:[legacyProduct],skus:[],movements:[]});
  assert.equal(parsed.products[0].category,'이전 사용자 분류');
  assert.equal(parseCatalog({mode:'local',season_options,categories,products:[{...product,internal_name:'LEG001-000001'}],skus:[],movements:[]}).products[0].internal_name,'LEG001-000001');
});
test('uncertain stock retry keeps original request ID and version despite refreshed stock',()=>{
  let generated=0;const id=()=>`request-${++generated}`;
  const initial=movementRequest(null,{sku_id:'s1',delta:5,reason:' 입고 '},0,id);
  const retry=movementRequest(initial,{sku_id:'s1',delta:5,reason:'입고'},9,id);
  assert.strictEqual(retry,initial);assert.equal(retry.version,0);assert.equal(generated,1);
  const changed=movementRequest(retry,{sku_id:'s1',delta:3,reason:'입고'},9,id);
  assert.equal(changed.request_id,'request-2');assert.equal(changed.version,9);
  const resolved=movementRequest(null,{sku_id:'s1',delta:5,reason:'입고'},10,id);
  assert.equal(resolved.request_id,'request-3');
});
test('season selection is canonical and four seasons become exclusive all-season',()=>{
  assert.deepEqual(toggleSeason(['FA'],'SP'),['SP','FA']);
  assert.deepEqual(toggleSeason(['SP','SU','FA'],'WI'),['ALL']);
  assert.deepEqual(toggleSeason(['SP','FA'],'ALL'),['ALL']);
  assert.deepEqual(toggleSeason(['ALL'],'WI'),['WI']);
  assert.deepEqual(toggleSeason(['ALL'],'ALL'),[]);
  assert.throws(()=>parseProduct({...product,seasons:['ALL','SP']}));
  assert.throws(()=>parseProduct({...product,seasons:['FA','SP']}));
  assert.throws(()=>parseProduct({...product,seasons:['SP','SP']}));
});
test('category hierarchy and naming preview use server categories without guessing serial numbers',()=>{
  const child={...categories[0],id:'tops-tee',name:'티셔츠',code:'TEE',parent_id:'tops'};
  const hierarchy=[...categories,child];
  assert.equal(internalNamePreview(hierarchy,'tops-tee',['SP','FA']),'TOP-TEE-SPFA-자동 생성');
  assert.equal(internalNamePreview(hierarchy,'tops-tee',['ALL']),'TOP-TEE-ALL-자동 생성');
  assert.equal(categoryPath(hierarchy,'tops-tee'),'상의 > 티셔츠');
  assert.equal(categoryPath(hierarchy,'tops'),'상의 · 세부 분류 미지정');
  assert.throws(()=>parseCatalog({mode:'local',season_options,categories:[...categories,{...child,parent_id:'missing'}],products:[],skus:[],movements:[]}));
  assert.throws(()=>parseCatalog({mode:'local',season_options,categories:[...hierarchy,{...child,id:'third-level',code:'THIRD',parent_id:'tops-tee'}],products:[],skus:[],movements:[]}));
  const legacy=parseCatalog({mode:'local',season_options,categories:[{...categories[0],is_active:false}],products:[product],skus:[],movements:[]});
  assert.deepEqual(legacy.products[0].seasons,[]);
  assert.equal(legacy.categories[0].is_active,false);
});
test('catalog requests keep auth server-side and map actionable HTTP failures',async()=>{
  for(const [status,reason] of [[401,'auth'],[409,'conflict'],[422,'validation'],[404,'missing'],[503,'unavailable']] as const){
    const result=await catalogRequest('/api/admin/catalog',parseCatalog,{fetcher:async(_input,init)=>{assert.equal(init?.credentials,'same-origin');assert.equal(init?.headers,undefined);return new Response('{}',{status});}});
    assert.deepEqual(result,{ok:false,reason});
  }
  assert.deepEqual(await catalogRequest('/api/admin/catalog',parseCatalog,{fetcher:async()=>new Response('{"mode":"production"}')}),{ok:false,reason:'unavailable'});
  assert.deepEqual(await catalogRequest('/api/admin/catalog',parseCatalog,{fetcher:async()=>{throw Error('offline');}}),{ok:false,reason:'unavailable'});
});
