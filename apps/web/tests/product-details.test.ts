import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProduct} from '../src/lib/catalog.ts';
import {parsePublicProduct} from '../src/lib/storefront.ts';

const details={material_info:'면 100%',care_instructions:'찬물 손세탁',measurement_note:'단면 기준',measurements:[{size:'M',label:'가슴 단면',value_cm:52.5}]};
const admin={id:'p1',name:'상품',internal_name:'TOP-1',category_id:'tops',category:'상의',seasons:['SP'],description:'설명',version:0};
const customer={id:'p1',name:'상품',category_id:'tops',description:'설명',price:10000,discount_price:null,effective_price:10000,discount_rate:null,image:'',color:'',sold_out:true,options:[],images:[],review_summary:{review_count:0,average_rating:null}};
test('admin and public parsers preserve structured clothing details',()=>{
 assert.deepEqual(parseProduct({...admin,details}).details,details);
 assert.deepEqual(parsePublicProduct({...customer,details}).details,details);
});
test('legacy responses provide empty clothing details',()=>{
 assert.deepEqual(parseProduct(admin).details,{material_info:'',care_instructions:'',measurement_note:'',measurements:[]});
});
test('details parsers reject invalid dimensions and duplicate size measurements',()=>{
 for(const value of [0,-1,501,NaN,Infinity,true,'52']){
  assert.throws(()=>parseProduct({...admin,details:{...details,measurements:[{size:'M',label:'가슴',value_cm:value}]}}));
 }
 assert.throws(()=>parseProduct({...admin,details:{...details,measurements:[{size:'M',label:'가슴',value_cm:50},{size:' m ',label:'가슴',value_cm:51}]}}));
 for(const invalid of [null,[],{...details,private_note:'bad'},{...details,material_info:'x'.repeat(1001)},{...details,measurements:Array.from({length:101},(_,i)=>({size:String(i),label:'길이',value_cm:1}))}])assert.throws(()=>parseProduct({...admin,details:invalid}));
});
