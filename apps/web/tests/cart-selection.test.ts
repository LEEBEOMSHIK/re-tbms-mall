import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {customerRoute,CUSTOMER_COOKIE,safeCustomerReturn} from '../src/lib/customer-auth-core.ts';
import {parseCart} from '../src/lib/customer-shopping.ts';
import {parseCheckoutEntry, selectedCheckoutCart, checkoutEntryPath} from '../src/lib/checkout-selection.ts';

const line={product_id:'p',name:'상품',color:'black',size:'M',quantity:2,price:900,discount_price:null,effective_price:900,image:null,available_quantity:5,available:true,unavailable_reason:null,line_total:1800};
const cart=parseCart({version:4,items:[{...line,sku_id:'A'},{...line,sku_id:'B',available:false,line_total:null}],total:1800,item_count:4,has_unavailable:true});
test('selected checkout binds URL to cart version and subsets totals and availability',()=>{
 const entry=parseCheckoutEntry({sku_id:'A',cart_version:'4'});
 assert.equal(entry.kind,'selected');
 if(entry.kind!=='selected')throw Error();
 const selected=selectedCheckoutCart(cart,entry);
 assert.deepEqual(selected?.items.map(row=>row.sku_id),['A']);
 assert.equal(selected?.total,1800);
 assert.equal(selected?.item_count,2);
 assert.equal(selected?.has_unavailable,false);
 assert.equal(selectedCheckoutCart({...cart,version:5},entry),null);
 assert.equal(selectedCheckoutCart(cart,{...entry,skuIds:['absent']}),null);
 const multi=parseCheckoutEntry({sku_id:['A','B'],cart_version:'4'});
 assert.equal(safeCustomerReturn(checkoutEntryPath(multi)),'/checkout?sku_id=A&sku_id=B&cart_version=4');
 assert.equal(parseCheckoutEntry({}).kind,'cart');
 assert.equal(parseCheckoutEntry({sku:'A',quantity:'2'}).kind,'direct');
});
test('ambiguous, empty, duplicate, overlong or unversioned selections fail closed',()=>{
 for(const query of [{sku_ids:'A'},{sku_id:'A'},{cart_version:'4'},{sku_id:'',cart_version:'4'},{sku_id:['A','A'],cart_version:'4'},{sku_id:'A/B',cart_version:'4'},{sku_id:'A',cart_version:['4','4']},{sku:'A',sku_id:'B',cart_version:'4'},{sku_id:'A',cart_version:'-1'},{sku_id:'A',cart_version:'9007199254740992'},{sku_id:Array.from({length:101},(_,i)=>String(i)),cart_version:'4'}]){
  assert.equal(parseCheckoutEntry(query).kind,'invalid');
  assert.equal(checkoutEntryPath(parseCheckoutEntry(query)),'/cart');
 }
});
test('cart shipping policy is optional and accepts only nonnegative safe integer amounts',()=>{
 assert.equal(cart.shipping_policy,undefined);
 const policy={base_fee:3000,free_threshold:50000};
 assert.deepEqual(parseCart({...cart,shipping_policy:{...policy,secret:'ignored'}}).shipping_policy,policy);
 for(const bad of [null,{}, {...policy,base_fee:-1},{...policy,free_threshold:0.5}])assert.throws(()=>parseCart({...cart,shipping_policy:bad}));
});
const origin='http://localhost:3100', token='x'.repeat(43), guard=createHash('sha256').update('cart-session:'+token).digest('hex'), request_id='11111111-1111-4111-8111-111111111111';
test('new cart mutations enforce origin, authentication, guard and payload then return public cart only',async()=>{
 for(const [action,fields] of [['remove-selection',{sku_ids:['A','B']}],['change-option',{sku_id:'A',target_sku_id:'B'}]] as const){
  let calls=0;
  const body={...fields,version:4,request_id};
  const config={origin,apiBase:'http://api.test',fetcher:async(path:RequestInfo|URL,init?:RequestInit)=>{
   calls++;assert.equal(String(path),'http://api.test/api/v1/customer/cart/'+action);assert.equal(new Headers(init?.headers).get('authorization'),'Bearer '+token);
   assert.deepEqual(JSON.parse(String(init?.body)),body);
   return Response.json({...cart,private_data:'hidden'});
  }};
  const request=(payload:unknown,headers:Record<string,string>={})=>customerRoute(new Request(origin,{method:'POST',headers:{origin,cookie:CUSTOMER_COOKIE+'='+token,'x-cart-session':guard,'content-type':'application/json',...headers},body:JSON.stringify(payload)}),['cart',action],config);
  assert.equal((await request(body,{origin:'https://other.test'})).status,403);
  assert.equal((await request(body,{cookie:''})).status,401);
  assert.equal((await request(body,{'x-cart-session':'stale'})).status,409);
  assert.equal((await request({...body,price:999})).status,422);
  assert.equal((await request({...body,...(action==='remove-selection'?{sku_ids:[]}:{target_sku_id:'A'})})).status,422);
  assert.equal(calls,0);
  const result=await request(body);
  assert.equal(result.status,200);
  const data=await result.json();assert.equal(data.session_guard,guard);assert.equal(data.private_data,undefined);
 }
});
test('selected checkout BFF rejects malformed selections and forwards the exact subset',async()=>{
 const payload={source:'cart',cart_version:4,sku_ids:['A'],request_id};
 const responseDraft={...cart,items:[cart.items[0]],has_unavailable:false,item_count:2,id:request_id,status:'draft',shipping:null,shipping_fee:null,grand_total:null,delivery_status:'address_required',payment_enabled:false,created_at:1,updated_at:1};
 let calls=0;
 const config={origin,apiBase:'http://api.test',fetcher:async(_:unknown,init?:RequestInit)=>{
  calls++;
  assert.deepEqual(JSON.parse(String(init?.body)),payload);
  return Response.json(responseDraft);
 }};
 const request=(body:unknown)=>customerRoute(new Request(origin,{method:'POST',headers:{origin,cookie:CUSTOMER_COOKIE+'='+token,'x-cart-session':guard,'content-type':'application/json'},body:JSON.stringify(body)}),['checkouts'],config);
 for(const invalid of [{...payload,sku_ids:[]},{...payload,sku_ids:null},{...payload,sku_ids:['A','A']},{...payload,cart_version:undefined},{...payload,source:'direct'},{...payload,price:1}])assert.equal((await request(invalid)).status,422);
 assert.equal(calls,0);
 assert.equal((await request(payload)).status,200);
 assert.equal(calls,1);
});
test('a selected checkout cannot continue with an upstream draft containing extra or missing SKUs',async()=>{
 const body={source:'cart',cart_version:4,sku_ids:['A'],request_id};
 for(const items of [cart.items,[],[cart.items[1]]]){
  const upstream={...cart,items,item_count:items.reduce((sum,i)=>sum+i.quantity,0),total:items.reduce((sum,i)=>sum+(i.line_total??0),0),has_unavailable:items.some(i=>!i.available),id:request_id,status:'draft',shipping:null,shipping_fee:null,grand_total:null,delivery_status:'address_required',payment_enabled:false,created_at:1,updated_at:1};
  const request=new Request(origin,{method:'POST',headers:{origin,cookie:CUSTOMER_COOKIE+'='+token,'x-cart-session':guard,'content-type':'application/json'},body:JSON.stringify(body)});
  const result=await customerRoute(request,['checkouts'],{origin,apiBase:'http://api.test',fetcher:async()=>Response.json(upstream)});
  assert.equal(result.status,503);
 }
});
