import test from 'node:test';import assert from 'node:assert/strict';
import {parseMovementConfirmation} from '../src/lib/catalog.ts';
const request={sku_id:'sku',delta:5,reason:'입고',version:3,request_id:'r'};
const row={id:'movement',sku_id:'sku',delta:5,reason:'입고',actor:'local-admin',created_at:'2026-10-26T00:00:00Z',balance_after:12,request_id:'r'};
test('confirmed movement derives actual before/after also for decrease and retry',()=>{
 assert.equal(parseMovementConfirmation(row,request).balance_after-row.delta,7);
 assert.equal(parseMovementConfirmation({...row,delta:-2,balance_after:5},{...request,delta:-2}).balance_after,5);
 assert.deepEqual(parseMovementConfirmation(row,request),parseMovementConfirmation(row,request));
});
test('reject mismatched or impossible movement confirmations',()=>{
 for(const change of [{sku_id:'other'},{request_id:'other'},{delta:4},{reason:'other'},{balance_after:3},{balance_after:1000001}])assert.throws(()=>parseMovementConfirmation({...row,...change},request));
});
