import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseSalesOrder,parseSalesOrders,parseOrderDetail,orderLabel,type SalesOrder} from '../src/lib/sales-orders.ts';
import {safeCustomerReturn} from '../src/lib/customer-shopping.ts';
const base:SalesOrder={id:'00000000-0000-4000-8000-000000000001',number:'DEMO-1',created_at:'2026-11-01T00:00:00Z',status:'confirmed',payment_status:'succeeded',fulfillment_status:'preparing',goods_total:20000,shipping_total:3000,grand_total:23000,item_count:2,summary:'합성 셔츠',is_demo:true};
test('orders validate amounts and statuses and discard private extras',()=>{const o=parseSalesOrder({...base,customer_id:'private',provider_token:'secret'});assert.equal(orderLabel(o),'상품 준비 중');assert.ok(!('customer_id'in o));assert.throws(()=>parseSalesOrder({...base,grand_total:1}));assert.throws(()=>parseSalesOrder({...base,status:'other'}));assert.throws(()=>parseSalesOrder({...base,goods_total:-1}));assert.throws(()=>parseSalesOrder({...base,created_at:'no'}));});
test('order detail totals and quantity must match immutable line snapshots',()=>{const detail={...base,lines:[{id:'line',product_name:'합성 셔츠',color:'빨강',size:'스몰',quantity:2,unit_price:10000,line_total:20000}],shipping:{recipient:'합성',phone:'01000000000',postal_code:'04524',address:'합성로',address_detail:'101호',memo:''},shipments:[],events:[]};assert.equal(parseOrderDetail(detail).lines[0].size,'스몰');assert.throws(()=>parseOrderDetail({...detail,item_count:3}));assert.throws(()=>parseOrderDetail({...detail,lines:[{...detail.lines[0],line_total:1}]}));});
test('order list pagination and safe login return retain route boundaries',()=>{assert.deepEqual(parseSalesOrders({orders:[],next_cursor:null}),{orders:[],next_cursor:null});assert.throws(()=>parseSalesOrders({orders:Array(51).fill(base),next_cursor:null}));for(const p of ['/account/orders','/account/orders/'+base.id])assert.equal(safeCustomerReturn(p),p);assert.equal(safeCustomerReturn('/account/orders/../../admin'),'/cart');});

test('status tone follows displayed terminal/payment/shipping precedence',async()=>{
 const {orderTone}=await import('../src/lib/sales-orders.ts');
 assert.equal(orderTone({...base,status:'expired',payment_status:'unknown'}),'stopped');
 assert.equal(orderTone({...base,status:'closed',payment_status:'unknown'}),'success');
 assert.equal(orderTone({...base,payment_status:'unknown'}),'attention');
 assert.equal(orderTone({...base,payment_status:'pending'}),'waiting');
 assert.equal(orderTone({...base,payment_status:'failed'}),'attention');
 assert.equal(orderTone({...base,payment_status:'cancelled'}),'stopped');
 assert.equal(orderTone({...base,fulfillment_status:'partially_shipped'}),'progress');
 assert.equal(orderTone({...base,fulfillment_status:'delivered'}),'success');
});
