import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {customerRoute,safeCustomerReturn,CUSTOMER_COOKIE} from '../src/lib/customer-auth-core.ts';
const origin='http://localhost:3100';
const request=(path:string,method='GET',body?:unknown,headers:Record<string,string>={})=>new Request(origin+'/api/customer/'+path,{method,headers:{host:'localhost:3100',...(path.startsWith('cart/items/')?{'x-cart-session':createHash('sha256').update('cart-session:'+'a'.repeat(43)).digest('hex')}:{}),...(method==='GET'?{}:{origin,'content-type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
const token='a'.repeat(43);
const customer={id:'11111111-1111-4111-8111-111111111111',display_name:'고객',provider:'google'};
test('customer redirect allowlist rejects external, encoded separators, admin and control characters',()=>{for(const path of ['//evil.test','/\\evil','https://evil.test','/admin','/products/%2f%2fevil','/cart\r\nX:1','/products/a/../../admin'])assert.equal(safeCustomerReturn(path),'/cart');assert.equal(safeCustomerReturn('/products/abc?color=navy&size=M'),'/products/abc?color=navy&size=M');});
test('customer mutations reject CSRF/forwarded host and do not call backend',async()=>{let calls=0;const config={origin,apiBase:'http://api.test',fetcher:async()=>{calls++;return Response.json({});}};for(const headers of [{origin:'https://evil.test'},{origin:''},{host:'evil.test',origin:'https://evil.test','x-forwarded-host':'localhost:3100'}] as Record<string,string>[]){const r=await customerRoute(request('logout','POST',{},headers),['logout'],config);assert.equal(r.status,403);}assert.equal(calls,0);});
test('OAuth start sets only scoped HttpOnly flow cookie and redirects to allowlisted provider',async()=>{const response=await customerRoute(request('oauth/google/start','POST',{return_to:'/products/abc'}),['oauth','google','start'],{origin,apiBase:'http://api.test',fetcher:async()=>Response.json({authorization_url:'https://accounts.google.com/o/oauth2/v2/auth?state=state',flow_token:token})});assert.equal(response.status,303);assert.match(response.headers.get('set-cookie')!,/HttpOnly/);assert.match(response.headers.get('set-cookie')!,/SameSite=Lax/);assert.match(response.headers.get('set-cookie')!,/Path=\/api\/customer\/oauth\/google/);assert.equal((await response.text()).includes(token),false);});
test('callback consumes browser flow, strips secrets from response and installs independent customer cookie',async()=>{let submitted:unknown;const r=await customerRoute(new Request(origin+'/api/customer/oauth/google/callback?code=code&state=state',{headers:{host:'localhost:3100',cookie:'tbms_customer_flow_google='+token}}),['oauth','google','callback'],{origin,apiBase:'http://api.test',fetcher:async(_url:unknown,init?:RequestInit)=>{submitted=JSON.parse(init?.body as string);return Response.json({session_token:token,expires_in:604800,return_to:'/products/abc',customer});}});assert.equal(r.status,303);assert.equal(r.headers.get('location'),origin+'/products/abc');assert.deepEqual(submitted,{code:'code',state:'state',flow_token:token});assert.match(r.headers.get('set-cookie')!,new RegExp(CUSTOMER_COOKIE+'='));assert.ok(!((await r.text()).includes(token)));});
test('callback without flow, repeated params or provider error never exchanges code',async()=>{let calls=0;for(const query of ['code=x&state=y','code=x&code=y&state=s','error=access_denied&state=s']){const r=await customerRoute(new Request(origin+'/api/customer/oauth/kakao/callback?'+query,{headers:{host:'localhost:3100'}}),['oauth','kakao','callback'],{origin,apiBase:'http://api.test',fetcher:async()=>{calls++;return Response.json({});}});assert.equal(r.status,303);assert.match(r.headers.get('location')!,/\/login\?error=/);}assert.equal(calls,0);});
test('cart forwards only customer cookie as bearer and redacts provider/server failures',async()=>{let auth='';const r=await customerRoute(request('cart','GET',undefined,{cookie:`admin_session=admin; ${CUSTOMER_COOKIE}=${token}`}),['cart'],{origin,apiBase:'http://api.test',fetcher:async(_url:unknown,init?:RequestInit)=>{auth=new Headers(init?.headers).get('authorization')!;return Response.json({detail:'SECRET INTERNAL SQL'}, {status:500});}});assert.equal(auth,'Bearer '+token);assert.equal(r.status,503);assert.ok(!(await r.text()).includes('SECRET'));assert.equal(r.headers.get('cache-control'),'no-store');});
test('production cookies are Secure and OAuth response cannot send the browser to another host',async()=>{const prod='https://shop.example';const req=new Request(prod+'/api/customer/oauth/google/start',{method:'POST',headers:{host:'shop.example',origin:prod,'content-type':'application/json'},body:'{}'});const options={origin:prod,apiBase:'https://api.example',production:true};const good=await customerRoute(req.clone(),['oauth','google','start'],{...options,fetcher:async()=>Response.json({authorization_url:'https://accounts.google.com/o/oauth2/v2/auth?state=s',flow_token:token})});assert.match(good.headers.get('set-cookie')!,/; Secure/);const bad=await customerRoute(req,['oauth','google','start'],{...options,fetcher:async()=>Response.json({authorization_url:'https://evil.example',flow_token:token})});assert.equal(bad.headers.get('location'),prod+'/login?error=unavailable&return_to=%2Fcart');});
test('cart receipt preserves absolute quantity and request id, strips unexpected response fields',async()=>{let sent:unknown;const cart={version:1,items:[],item_count:0,total:0,has_unavailable:false,internal_token:'secret'};const body={quantity:2,version:0,request_id:'11111111-1111-4111-8111-111111111111'};const r=await customerRoute(request('cart/items/sku','PUT',body,{cookie:`${CUSTOMER_COOKIE}=${token}`}),['cart','items','sku'],{origin,apiBase:'http://api.test',fetcher:async(_url:unknown,init?:RequestInit)=>{sent=JSON.parse(init?.body as string);return Response.json(cart);}});assert.equal(r.status,200);assert.deepEqual(sent,body);assert.equal((await r.json()).internal_token,undefined);});
test('logout requires successful revocation or expired server session, and clears only customer cookie',async()=>{const make=()=>request('logout','POST',{}, {cookie:`${CUSTOMER_COOKIE}=${token}; admin_session=keep`});const good=await customerRoute(make(),['logout'],{origin,apiBase:'http://api.test',fetcher:async()=>Response.json({ok:true})});assert.match(good.headers.get('set-cookie')!,/Max-Age=0/);assert.ok(!good.headers.get('set-cookie')!.includes('admin_session'));const bad=await customerRoute(make(),['logout'],{origin,apiBase:'http://api.test',fetcher:async()=>{throw Error('internal token secret');}});assert.equal(bad.status,503);assert.equal(bad.headers.get('set-cookie'),null);});
test('oversized request and duplicate customer cookies are rejected before backend calls',async()=>{let calls=0;const options={origin,apiBase:'http://api.test',fetcher:async()=>{calls++;return Response.json({});}};const dup=await customerRoute(request('cart','GET',undefined,{cookie:`${CUSTOMER_COOKIE}=${token}; ${CUSTOMER_COOKIE}=${token}`}),['cart'],options);assert.equal(dup.status,401);const large=await customerRoute(request('cart/items/sku','PUT',{value:'x'.repeat(5000)},{cookie:`${CUSTOMER_COOKIE}=${token}`}),['cart','items','sku'],options);assert.equal(large.status,422);assert.equal(calls,0);});

test('account profile passes only allowed fields and rejects malformed email',async()=>{
 const get=()=>request('me','GET',undefined,{cookie:`${CUSTOMER_COOKIE}=${token}`});
 const profile={...customer,display_name:'Sample',email:'sample@example.test',avatar_url:'https://lh3.googleusercontent.com/a/synthetic',profile_available:true};
 const r=await customerRoute(get(),['me'],{origin,apiBase:'http://api.test',fetcher:async()=>Response.json({customer:{...profile,subject:'private',access_token:'private'}})});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{customer:profile});
 const bad=await customerRoute(get(),['me'],{origin,apiBase:'http://api.test',fetcher:async()=>Response.json({customer:{...profile,email:{private:true}}})});
 assert.equal(bad.status,503);
});

test('OAuth failure preserves safe product selection for retry and rejects tampered return cookies',async()=>{
 const target='/products/abc?color=navy&size=M&quantity=2';
 for(const provider of ['google','kakao']){
  const config={origin,apiBase:'http://api.test',fetcher:async()=>Response.json({}, {status:503})};
  const start=await customerRoute(request(`oauth/${provider}/start`,'POST',{return_to:target}),['oauth',provider,'start'],config);
  assert.equal(new URL(start.headers.get('location')!).searchParams.get('return_to'),target);
  for(const returnTo of [target,'https://evil.test']){
   const callback=await customerRoute(new Request(`${origin}/api/customer/oauth/${provider}/callback?error=access_denied`,{headers:{host:'localhost:3100',cookie:`tbms_customer_return_${provider}=${encodeURIComponent(returnTo)}`}}),['oauth',provider,'callback'],config);
   const location=new URL(callback.headers.get('location')!);
   assert.equal(location.searchParams.get('return_to'),returnTo===target?target:'/cart');
   assert.equal(location.searchParams.get('error'),'cancelled');
   assert.match(callback.headers.get('set-cookie')!,new RegExp(`tbms_customer_return_${provider}=;`));
  }
 }
});


test('cart mutation rejects stale or missing session guard before contacting API',async()=>{
 let calls=0;const config={origin,apiBase:'http://api.test',fetcher:async()=>{calls++;return Response.json({});}};
 for(const guard of ['',createHash('sha256').update('cart-session:'+'b'.repeat(43)).digest('hex')]){
  const r=await customerRoute(request('cart/items/sku','PUT',{quantity:1,version:0,request_id:'11111111-1111-4111-8111-111111111111'},{cookie:`${CUSTOMER_COOKIE}=${token}`,'x-cart-session':guard}),['cart','items','sku'],config);
  assert.equal(r.status,409);
 }
 assert.equal(calls,0);
});

test('cart read supplies session binding without exposing the session credential',async()=>{
 const r=await customerRoute(request('cart','GET',undefined,{cookie:`${CUSTOMER_COOKIE}=${token}`}),['cart'],{origin,apiBase:'http://api.test',fetcher:async()=>Response.json({version:0,items:[],item_count:0,total:0,has_unavailable:false})});
 const cart=await r.json();assert.match(cart.session_guard,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(cart).includes(token));
});
