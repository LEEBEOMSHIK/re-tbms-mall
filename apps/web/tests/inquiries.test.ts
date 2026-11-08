import test from 'node:test';
import assert from 'node:assert/strict';
import {customerRoute,safeCustomerReturn} from '../src/lib/customer-auth-core.ts';
import {parseInquiry,parseInquiryList} from '../src/lib/inquiries.ts';
const id='00000000-0000-0000-0000-000000000001';
const item={id,category:'product',title:'test',content:'test',answer:null,status:'waiting',version:1,created_at:'2026-11-08',updated_at:'2026-11-08'};
test('inquiry contract and return paths',()=>{assert.equal(parseInquiry(item).id,id);assert.equal(parseInquiryList({items:[item],total:1,page:1}).total,1);assert.throws(()=>parseInquiry({...item,status:'bad'}));for(const path of ['/account/inquiries','/account/inquiries/new','/account/inquiries/'+id])assert.equal(safeCustomerReturn(path),path)});
test('private proxy auth, guard, parsing and forwarding',async()=>{let calls=0;const options={origin:'http://localhost:3100',apiBase:'http://api.test',fetcher:async()=>{calls++;return Response.json({items:[item],total:1,page:1})}};const url='http://localhost:3100/api/customer/inquiries';assert.equal((await customerRoute(new Request(url),['inquiries'],options)).status,401);const headers={cookie:'tbms_customer_session='+'a'.repeat(40),origin:'http://localhost:3100'};const r=await customerRoute(new Request(url,{headers}),['inquiries'],options);assert.equal(r.status,200);assert.ok((await r.json()).session_guard);assert.equal(calls,1);assert.equal((await customerRoute(new Request(url+'/'+id,{method:'PUT',headers,body:'{}'}),['inquiries',id],options)).status,409);assert.equal(calls,1)});
