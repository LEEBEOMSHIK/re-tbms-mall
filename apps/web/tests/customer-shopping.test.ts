import {safeCustomerAvatar} from '../src/lib/customer-shopping.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCart,parseCustomer,parseProviders,customerRequest,safeCustomerReturn,productLoginReturn} from '../src/lib/customer-shopping.ts';
const item={sku_id:'s1',product_id:'p1',name:'셔츠',color:'흰색',size:'M',quantity:2,price:1000,discount_price:null,effective_price:1000,image:null,available_quantity:5,available:true,unavailable_reason:null,line_total:2000};
const cart={version:0,items:[item],item_count:2,total:2000,has_unavailable:false};
test('cart validates integer money, counts, unavailable lines and identities',()=>{
 assert.equal(parseCart(cart).total,2000);
 for(const broken of [{...cart,total:0},{...cart,version:-1},{...cart,items:[item,item]},{...cart,items:[{...item,quantity:0}]},{...cart,items:[{...item,image:'https://evil.test/a'}]},{...cart,items:[{...item,price:1.5}]}])assert.throws(()=>parseCart(broken));
 assert.equal(parseCart({...cart,items:[{...item,available:false,unavailable_reason:'sold_out',price:null,effective_price:null,line_total:null}],total:0,has_unavailable:true}).total,0);
});
test('customer and provider parsers reject malformed authentication',()=>{assert.equal(parseCustomer({customer:{id:'c1',display_name:'고객',provider:'google'}}).provider,'google');assert.throws(()=>parseCustomer({customer:null}));assert.equal(parseProviders({providers:[{id:'google',enabled:false},{id:'kakao',enabled:true}]}).length,2);assert.throws(()=>parseProviders({providers:[{id:'google',enabled:'yes'}]}));});
test('return path only allows shopping routes',()=>{assert.equal(safeCustomerReturn('/products/p1?color=white'),'/products/p1?color=white');for(const path of ['//evil.test','/admin','/products/../admin','/products?next=https://evil.test','/products/%5cadmin'])assert.equal(safeCustomerReturn(path),'/cart');});
test('product login preserves selected spaced Korean color and drops list return context',()=>{const path=productLoginReturn('p1','멜란지 그레이','M','2');assert.equal(safeCustomerReturn(path),path);assert.equal(new URL(path,'http://localhost').searchParams.get('color'),'멜란지 그레이');assert.equal(new URL(path,'http://localhost').searchParams.has('from'),false);});
test('request preserves retry payload and redacts failures',async()=>{const body={quantity:2,version:0,request_id:'test'};let seen='';const result=await customerRequest('/cart/items/s1',parseCart,{method:'PUT',body},async(url,init)=>{assert.equal(url,'/api/customer/cart/items/s1');assert.equal(init?.credentials,'same-origin');seen=String(init?.body);return Response.json(cart);});assert.equal(result.ok,true);assert.deepEqual(JSON.parse(seen),body);for(const [status,reason] of [[401,'auth'],[409,'conflict'],[422,'invalid'],[503,'unknown']] as const)assert.deepEqual(await customerRequest('/cart',parseCart,{},async()=>new Response('secret',{status})),{ok:false,reason});});

test('customer avatars allow only HTTPS provider CDN images',()=>{
 assert.equal(safeCustomerAvatar('https://lh3.googleusercontent.com/a/photo'),'https://lh3.googleusercontent.com/a/photo');
 assert.equal(safeCustomerAvatar('https://k.kakaocdn.net/photo'),'https://k.kakaocdn.net/photo');
 for(const value of ['http://lh3.googleusercontent.com/a','https://googleusercontent.com.evil.test/a','javascript:alert(1)','https://user:pass@lh3.googleusercontent.com/a','https://lh3.googleusercontent.com:444/a',null])assert.equal(safeCustomerAvatar(value),null);
});
