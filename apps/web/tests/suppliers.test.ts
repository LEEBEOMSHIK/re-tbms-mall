import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSupplier,supplierDetailLimits,parseCatalog,parseMovement,movementRequest,parseMovementConfirmation} from '../src/lib/catalog.ts';
const row={id:'m',sku_id:'s',delta:2,reason:'',reason_code:'receipt',actor:'local-admin',created_at:'2026-10-26T00:00:00Z',balance_after:5,request_id:'r',supplier_id:'v',supplier_name:'공장'};
test('supplier optional details default empty for older responses and reject null/type/length violations',()=>{
 const base={id:'v',name:'공장',is_active:true,version:0};
 for(const [key,max] of Object.entries(supplierDetailLimits)){
  assert.equal(parseSupplier(base)[key as keyof typeof supplierDetailLimits],'');
  if(key==='country_code')continue;
  assert.equal(parseSupplier({...base,[key]:'a'.repeat(max)})[key as keyof typeof supplierDetailLimits],'a'.repeat(max));
  assert.equal(parseSupplier({...base,[key]:'😀'.repeat(max)})[key as keyof typeof supplierDetailLimits],'😀'.repeat(max));
  assert.throws(()=>parseSupplier({...base,[key]:'😀'.repeat(max+1)}));
  for(const value of [null,42,'a'.repeat(max+1)])assert.throws(()=>parseSupplier({...base,[key]:value}));
 }
});
test('supplier country and international address parse without removing existing address fields',()=>{
 const base={id:'v',name:'공급처',is_active:true,version:0,address:'Original',address_detail:'Unit 2',postal_code:'AB-12',region:'Region',city:'City'};
 for(const country_code of ['', 'KR', 'US']) {
  const parsed=parseSupplier({...base,country_code});assert.equal(parsed.country_code,country_code);assert.equal(parsed.address,'Original');assert.equal(parsed.address_detail,'Unit 2');assert.equal(parsed.postal_code,'AB-12');
 }
 for(const country_code of [null,'kr','K','KOR',12])assert.throws(()=>parseSupplier({...base,country_code}));
 const catalog={mode:'local',categories:[],products:[],skus:[],movements:[],season_options:[{code:'SP',label:'봄'},{code:'SU',label:'여름'},{code:'FA',label:'가을'},{code:'WI',label:'겨울'},{code:'ALL',label:'사계절'}]};
 assert.equal(parseCatalog(catalog).country_codes,undefined);
 assert.deepEqual(parseCatalog({...catalog,country_codes:['KR','US']}).country_codes,['KR','US']);
 for(const country_codes of [null,['KR','KR'],['kr'],[12]])assert.throws(()=>parseCatalog({...catalog,country_codes}));
});
test('supplier response and historical snapshot require consistent fields',()=>{assert.equal(parseSupplier({id:'v',name:'공장',is_active:true,version:0}).name,'공장');assert.throws(()=>parseSupplier({id:'v',name:'',is_active:true,version:0}));assert.equal(parseMovement(row).supplier_name,'공장');assert.throws(()=>parseMovement({...row,supplier_name:null}));assert.throws(()=>parseMovement({...row,reason_code:'sale',delta:-2}));assert.equal(parseMovement({...row,supplier_id:undefined,supplier_name:undefined}).supplier_id,null)});
test('supplier identity participates in retry and confirmation',()=>{const q={sku_id:'s',delta:2,reason:'',reason_code:'receipt' as const,supplier_id:'v'};const r=movementRequest(null,q,0,()=> 'r');assert.equal(movementRequest(r,q,1,()=> 'new'),r);assert.equal(movementRequest(r,{...q,supplier_id:'v2'},0,()=> 'new').request_id,'new');assert.equal(parseMovementConfirmation(row,r).supplier_id,'v');assert.throws(()=>parseMovementConfirmation({...row,supplier_id:'v2'},r))});

