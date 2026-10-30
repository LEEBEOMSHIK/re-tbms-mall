import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {customerRoute,safeCustomerReturn,CUSTOMER_COOKIE} from '../src/lib/customer-auth-core.ts';
import {newAddressShipping,savedAddress} from '../src/lib/customer-account.ts';
import {emptyShipping} from '../src/lib/customer-checkout.ts';
const token='a'.repeat(43),origin='http://localhost:3100';
const guard=createHash('sha256').update('cart-session:'+token).digest('hex');
const account={version:0,profile:{name:'테스트',phone:''},addresses:[]};
test('save summary selects confirmed id despite normalized and duplicate address text',()=>{
 const old={id:'old',label:'집',is_default:true,shipping:{...emptyShipping,recipient:'수령인',address:'서울 합성로 10',address_detail:'1층'}};
 const added={...old,id:'new',is_default:false,shipping:{...old.shipping,address_detail:'2층'}};
 const result={...account,addresses:[old,added]};
 assert.equal(savedAddress(['old'],result)?.id,'new');
 assert.equal(savedAddress(['old','new'],result,'old')?.id,'old');
 assert.equal(savedAddress(['old','new'],result),undefined);
 assert.equal(savedAddress([],result),undefined);
});
test('delivery unification preserves legacy contact and prioritizes default address without mutation',()=>{
 const legacy={...account,profile:{name:'이전 이름',phone:'01012345678'}};
 assert.deepEqual(newAddressShipping(legacy),{...emptyShipping,recipient:'이전 이름',phone:'01012345678'});
 const existing={...legacy,addresses:[{id:'a',label:'집',is_default:true,shipping:{...emptyShipping,recipient:'배송 수령인',phone:'01098765432',address:'기존 주소',address_detail:'기존 상세'}}]};
 const before=structuredClone(existing);
 assert.deepEqual(newAddressShipping(existing),{...emptyShipping,recipient:'배송 수령인',phone:'01098765432'});
 assert.deepEqual(existing,before);
 assert.equal(newAddressShipping({...existing,addresses:[{...existing.addresses[0],is_default:false}]}).recipient,'이전 이름');
});
test('account writes require same session and origin and strip upstream private fields',async()=>{
 let calls=0;const config={origin,apiBase:'http://api.test',fetcher:async()=>{calls++;return Response.json({...account,secret:'private'})}};
 const req=(session=guard,from=origin)=>new Request(origin+'/api/customer/account',{method:'PUT',headers:{host:'localhost:3100',origin:from,cookie:`${CUSTOMER_COOKIE}=${token}`,'x-cart-session':session,'content-type':'application/json'},body:JSON.stringify({version:0,request_id:crypto.randomUUID(),name:'테스트',phone:''})});
 assert.equal((await customerRoute(req('stale'),['account'],config)).status,409);
 assert.equal((await customerRoute(req(guard,'https://evil.test'),['account'],config)).status,403);
 assert.equal(calls,0);
 const result=await customerRoute(req(),['account'],config);assert.equal(result.status,200);
 assert.deepEqual(await result.json(),{...account,session_guard:guard});
});
test('account login return supports only known account screens',()=>{
 for(const path of ['/account','/account/profile','/account/addresses','/account/addresses/new','/account/addresses/11111111-1111-4111-8111-111111111111/edit'])assert.equal(safeCustomerReturn(path),path);
 assert.equal(safeCustomerReturn('/account/admin'),'/cart');
});
