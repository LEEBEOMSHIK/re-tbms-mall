import test from 'node:test';import assert from 'node:assert/strict';
import {parseMovement,movementRequest,parseMovementConfirmation} from '../src/lib/catalog.ts';
const row={id:'m',sku_id:'s',delta:-2,reason:'지인 제공',reason_code:'gift',actor:'local-admin',created_at:'2026-10-26T00:00:00Z',balance_after:5,request_id:'r'};
test('classified movements validate code and direction; old rows remain unclassified',()=>{
 assert.equal(parseMovement(row).reason_code,'gift');assert.equal(parseMovement({...row,reason_code:undefined}).reason_code,'legacy');
 for(const patch of [{reason_code:'sale',delta:2},{reason_code:'receipt'},{reason_code:'unknown'},{reason_code:null}])assert.throws(()=>parseMovement({...row,...patch}));
});
test('reason changes get new retry identity and response must match reason',()=>{
 const input={sku_id:'s',delta:-2,reason:'메모',reason_code:'gift' as const};const first=movementRequest(null,input,0,()=> 'r');assert.equal(movementRequest(first,input,1,()=> 'different'),first);
 assert.equal(movementRequest(first,{...input,reason_code:'sale'},0,()=> 'new').request_id,'new');
 assert.throws(()=>parseMovementConfirmation(row,{...first,reason:'지인 제공',reason_code:'sale'}));
});

test('optional detail may be empty but must still match confirmed request',()=>{
 const blank={...row,reason:''};assert.equal(parseMovement(blank).reason,'');
 assert.equal(parseMovementConfirmation(blank,{sku_id:'s',delta:-2,reason:' ',reason_code:'gift',version:0,request_id:'r'}).reason,'');
 assert.throws(()=>parseMovement({...row,reason:null}));
});
