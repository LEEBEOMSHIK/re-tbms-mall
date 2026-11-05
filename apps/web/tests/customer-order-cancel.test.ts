import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {customerRoute,safeCustomerReturn,CUSTOMER_COOKIE} from '../src/lib/customer-auth-core.ts';
import {parseOrderDetail} from '../src/lib/sales-orders.ts';
const origin='http://localhost:3100',token='s'.repeat(40),guard=createHash('sha256').update('cart-session:'+token).digest('hex');
const id='00000000-0000-4000-8000-000000000001',key='00000000-0000-4000-8000-000000000002';
const detail={id,number:'TEST',created_at:'2026-01-01T00:00:00Z',status:'cancelled',payment_status:'cancelled',fulfillment_status:'unprepared',goods_total:0,shipping_total:0,grand_total:0,item_count:0,summary:'테스트',is_demo:false,lines:[],shipping:{recipient:'',phone:'',postal_code:'',address:'',address_detail:'',memo:''},shipments:[],events:[],can_cancel:false,reservation:{status:'released',server_now:'2026-01-01T00:01:00Z',expires_at:'2026-01-01T00:10:00Z',release_reason:'customer_cancelled'}};
test('customer cancellation requires owner session guard, same origin and exact UUID body',async()=>{
 const calls:RequestInit[]=[];
 const config={origin,apiBase:'http://api.test',fetcher:async(_:unknown,init?:RequestInit)=>{calls.push(init!);return Response.json({...detail,session_guard:'untrusted',private_key:'secret'})}};
 function run(method='GET',body:unknown={request_id:key},session=guard,from=origin,cookie=token){
  const path=['sales-orders',id,...(method==='POST'?['cancel']:[])];
  return customerRoute(new Request(origin+'/api/customer/'+path.join('/'),{method,headers:{origin:from,cookie:cookie?CUSTOMER_COOKIE+'='+cookie:'','x-cart-session':session,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})}),path,config);
 }
 assert.equal((await run('POST',{},guard,origin,'')).status,401);
 assert.equal((await run('POST',{},guard,'https://foreign.test')).status,403);
 assert.equal((await run('POST',{},'stale')).status,409);
 assert.equal((await run('POST',{request_id:'invalid'})).status,422);
 assert.equal((await run('POST',{request_id:key,customer_id:'other'})).status,422);
 assert.equal(calls.length,0);
 for(const method of ['GET','POST']){
  const result=await run(method);assert.equal(result.status,200);
  const data=await result.json();assert.equal(data.session_guard,guard);assert.equal(data.private_key,undefined);
  assert.equal(data.can_cancel,false);assert.equal(data.reservation.release_reason,'customer_cancelled');
 }
 assert.equal(safeCustomerReturn('/account/orders/'+id),'/account/orders/'+id);
 assert.equal(safeCustomerReturn('/account/orders/external'),'/cart');
 assert.equal(calls[1].body,JSON.stringify({request_id:key}));
 assert.equal(parseOrderDetail({...detail,can_cancel:undefined}).can_cancel,undefined);
 assert.throws(()=>parseOrderDetail({...detail,can_cancel:'yes'}));
});
