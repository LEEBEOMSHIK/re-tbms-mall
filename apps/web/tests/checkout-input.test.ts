import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearCheckoutInputs,readCheckoutInput,writeCheckoutInput} from '../src/lib/checkout-input.ts';
import {emptyShipping} from '../src/lib/customer-checkout.ts';
function storage(){const data=new Map<string,string>();return {get length(){return data.size},key:(i:number)=>[...data.keys()][i]??null,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}}
test('incomplete input survives reload and is isolated by checkout and authenticated session',()=>{
 const s=storage(),input={...emptyShipping,recipient:'합성 회원',phone:'010',memo:'작성 중'};
 writeCheckoutInput(s,'a','session-a',input);
 assert.deepEqual(readCheckoutInput(s,'a','session-a'),input);
 assert.equal(readCheckoutInput(s,'b','session-a'),null);
 assert.equal(readCheckoutInput(s,'a','session-b'),null);
 assert.equal(readCheckoutInput(s,'a','session-a'),null);
});
test('logout removes only checkout inputs; corrupt or unavailable storage is safe',()=>{
 const s=storage();s.setItem('other','keep');writeCheckoutInput(s,'a','a',emptyShipping);writeCheckoutInput(s,'b','a',emptyShipping);
 clearCheckoutInputs(s);assert.equal(s.length,1);assert.equal(s.getItem('other'),'keep');
 s.setItem('checkout-input:a','broken');assert.equal(readCheckoutInput(s,'a','a'),null);
 s.setItem('checkout-input:a',JSON.stringify({guard:'a',shipping:{...emptyShipping,memo:'x'.repeat(201)}}));assert.equal(readCheckoutInput(s,'a','a'),null);
 const blocked={...s,getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}};
 assert.equal(readCheckoutInput(blocked,'a','a'),null);assert.doesNotThrow(()=>writeCheckoutInput(blocked,'a','a',emptyShipping));
 writeCheckoutInput(s,'a',undefined,emptyShipping);assert.equal(s.getItem('checkout-input:a'),null);
});
