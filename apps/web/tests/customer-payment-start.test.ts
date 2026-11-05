import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {customerRoute, CUSTOMER_COOKIE} from '../src/lib/customer-auth-core.ts';

test('payment start validates the order detail and binds writes to the customer session',async()=>{
 const origin='http://localhost:3100';
 const id='11111111-1111-4111-8111-111111111111';
 const path=['checkouts',id,'payment'];
 const token='x'.repeat(43);
 const guard=createHash('sha256').update('cart-session:'+token).digest('hex');
 const request=(session=guard)=>new Request(origin+'/api/customer/'+path.join('/'),{
  method:'POST',headers:{host:'localhost:3100',origin,cookie:CUSTOMER_COOKIE+'='+token,'x-cart-session':session},body:'{}'
 });
 const at='2026-11-04T00:00:00Z';
 const receipt={
  id,number:'20261104-TESTORDER2',created_at:at,status:'awaiting_payment',payment_status:'pending',
  fulfillment_status:'unprepared',goods_total:10000,shipping_total:3000,grand_total:13000,item_count:1,
  summary:'테스트 셔츠',is_demo:false,lines:[{id:'line',product_name:'테스트 셔츠',color:'Ivory',size:'M',quantity:1,unit_price:10000,line_total:10000}],
  shipping:{recipient:'테스트',phone:'01000000000',postal_code:'00000',address:'합성 주소',address_detail:'테스트',memo:''},
  shipments:[],events:[],reservation:{status:'held',expires_at:'2026-11-04T00:10:00Z',server_now:at},private_field:'discard'
 };
 let calls=0;
 const options={origin,apiBase:'http://api.test',fetcher:async()=>{
  calls++;return Response.json(receipt,{status:201});
 }};
 assert.equal((await customerRoute(request('outdated'),path,options)).status,409);
 assert.equal(calls,0);
 const success=await customerRoute(request(),path,options);
 assert.equal(success.status,201);
 const data=await success.json();
 assert.equal(data.number,receipt.number);
 assert.deepEqual(data.reservation,receipt.reservation);
 assert.equal(data.private_field,undefined);
 const bad=await customerRoute(request(),path,{...options,fetcher:async()=>Response.json({status:'draft'})});
 assert.equal(bad.status,503);
});
