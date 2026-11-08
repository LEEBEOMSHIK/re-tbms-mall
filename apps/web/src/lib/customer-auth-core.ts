import {createHash} from 'node:crypto';
import {isCartSku,validSkuSelection,parseCheckoutEntry} from './checkout-selection.ts';
import {safeCustomerAvatar} from './customer-shopping.ts';
export const CUSTOMER_COOKIE='tbms_customer_session';
const SESSION_SECONDS=7*24*60*60;
type Provider='google'|'kakao';
type Options={origin:string;apiBase:string;production?:boolean;fetcher?:typeof fetch};
const providers:Provider[]=['google','kakao'];
const secret=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_-]{32,256}$/.test(value);
export function safeCustomerReturn(value:unknown):string {
 if(typeof value!=='string'||value.length>2048||/[\\\x00-\x1f\x7f]/.test(value)||!value.startsWith('/')||value.startsWith('//'))return '/cart';
 try{const url=new URL(value,'https://local.invalid');if(url.origin!=='https://local.invalid'||!/^\/(?:cart|orders|account(?:\/(?:orders(?:\/[a-f0-9-]{36})?|claims(?:\/(?:new|[a-f0-9-]{36}))?|inquiries(?:\/(?:new|[a-f0-9-]{36}))?|profile|addresses(?:\/(?:new|[a-f0-9-]{36}\/edit))?))?|checkout(?:\/[A-Za-z0-9_-]+)?|products(?:\/[A-Za-z0-9_-]+)?)$/.test(url.pathname)||url.hash)return '/cart';
  if(url.searchParams.has('order_id')){
   if(!['/account/claims','/account/claims/new'].includes(url.pathname)||[...url.searchParams.keys()].some(key=>key!=='order_id')||url.searchParams.getAll('order_id').length!==1||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(url.searchParams.get('order_id')!))return '/cart';
   return url.pathname+url.search;
  }
  if(url.searchParams.has('sku_id')||url.searchParams.has('cart_version')){
   if(url.pathname!=='/checkout'||[...url.searchParams.keys()].some(key=>!['sku_id','cart_version'].includes(key))||
    parseCheckoutEntry({sku_id:url.searchParams.getAll('sku_id'),cart_version:url.searchParams.getAll('cart_version').length===1?url.searchParams.get('cart_version')!:undefined}).kind!=='selected')return '/cart';
   return url.pathname+url.search;
  }
  for(const [key,val] of url.searchParams){if(!['color','size','quantity','category','search','page','season','sku'].includes(key)||/[\\\x00-\x1f\x7f]/.test(val)||/https?:|\/\//i.test(val))return '/cart';}
  return url.pathname+url.search;
 }catch{return '/cart';}
}
function cookie(request:Request,name:string):string|null {
 const values=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));
 if(values.length!==1)return null;
 try{return decodeURIComponent(values[0].slice(name.length+1));}catch{return null;}
}
function setCookie(name:string,value:string,maxAge:number,path:string,production:boolean){return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${production?'; Secure':''}`;}
function reply(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function redirect(location:string,cookies:string[]=[]){const headers=new Headers({Location:location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});cookies.forEach(c=>headers.append('Set-Cookie',c));return new Response(null,{status:303,headers});}
const messages:Record<number,string>={401:'고객 로그인이 필요합니다.',403:'허용하지 않는 요청입니다.',404:'현재 이용할 수 없는 상품이나 옵션입니다.',409:'장바구니 또는 상품 상태가 바뀌었습니다. 최신 상태를 확인해 주세요.',422:'선택한 옵션과 수량을 확인해 주세요.',429:'요청이 많습니다. 잠시 후 다시 시도해 주세요.',503:'요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'};
function failure(status:number){const safe=messages[status]?status:503;return reply({error:messages[safe]},safe);}
function claimFailure(status:number){
 const errors:Record<number,string>={404:'주문 또는 접수를 찾을 수 없습니다.',409:'접수 상태나 신청 가능 수량이 바뀌었습니다. 최신 내용을 확인해 주세요.',422:'접수 사유·수량·수령일·주소와 사진을 확인해 주세요.'};
 return errors[status]?reply({error:errors[status]},status):failure(status);
}
function publicCustomer(value:unknown){
 if(!value||typeof value!=='object')throw Error('Invalid customer');
 const v=value as Record<string,unknown>;
 if(typeof v.id!=='string'||!v.id||v.id.length>128||typeof v.display_name!=='string'||v.display_name.length>200||!providers.includes(v.provider as Provider))throw Error('Invalid customer');
 if(v.email!==undefined&&v.email!==null&&(typeof v.email!=='string'||v.email.length>254))throw Error('Invalid email');
 if(v.profile_available!==undefined&&typeof v.profile_available!=='boolean')throw Error('Invalid profile');
 return {id:v.id,display_name:v.display_name,provider:v.provider,...(v.avatar_url===undefined?{}:{avatar_url:safeCustomerAvatar(v.avatar_url)}),...(v.email===undefined?{}:{email:v.email}),...(v.profile_available===undefined?{}:{profile_available:v.profile_available})};
}
async function readBody(request:Request, limit=4096){
 const raw=await request.text();if(raw.length>limit)throw Error('Body too large');
 if(request.headers.get('content-type')?.includes('application/x-www-form-urlencoded'))return Object.fromEntries(new URLSearchParams(raw));
 const value=JSON.parse(raw||'{}');if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Invalid body');return value as Record<string,unknown>;
}
// Claim uploads are the only customer endpoint allowed a larger body. Stop reading
// at the byte limit, including chunked requests without Content-Length.
async function readClaimBody(request:Request,limit:number){
 const length=request.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>limit))throw Error('Body too large');
 const reader=request.body?.getReader();if(!reader)return {};
 const chunks:Uint8Array[]=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();throw Error('Body too large')}chunks.push(value)}}finally{reader.releaseLock()}
 const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength}
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined));if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Invalid body');return value as Record<string,unknown>;
}
export async function customerRoute(request:Request,path:string[],options:Options):Promise<Response>{
 const production=!!options.production;
 let origin:string;
 try{const url=new URL(options.origin);if(url.pathname!=='/'||url.search||url.hash||url.username||url.password||!(url.protocol==='https:'||(!production&&url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw Error();origin=url.origin;}catch{return failure(503);}
 const configured=new URL(origin);
 // Never derive OAuth redirect destinations from forwarded headers or caller input.
 if((request.headers.get('host')||new URL(request.url).host)!==configured.host)return failure(403);
 const method=request.method;
 if(method!=='GET'&&request.headers.get('origin')!==origin)return failure(403);
 const fetcher=options.fetcher||fetch;
 const call=(route:string,token?:string,body?:unknown,verb=body===undefined?'GET':'POST')=>fetcher(options.apiBase.replace(/\/$/,'')+'/api/v1/customer'+route,{method:verb,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000),headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(path.length===3&&path[0]==='oauth'&&providers.includes(path[1] as Provider)){
  const provider=path[1] as Provider,flowName='tbms_customer_flow_'+provider,flowPath='/api/customer/oauth/'+provider;
  const returnName='tbms_customer_return_'+provider;
  const clear=setCookie(flowName,'',0,flowPath,production),clearReturn=setCookie(returnName,'',0,flowPath,production);
  const retry=(reason:string,target:unknown)=>origin+'/login?error='+reason+'&return_to='+encodeURIComponent(safeCustomerReturn(target));
  if(path[2]==='start'&&method==='POST'){
   let body;try{body=await readBody(request);}catch{return failure(422);}
   const returnTo=safeCustomerReturn(body.return_to);
   try{const result=await call(`/oauth/${provider}/start`,undefined,{return_to:returnTo});if(!result.ok)return redirect(retry('unavailable',returnTo),[clear,clearReturn]);const data=await result.json();const target=new URL(data.authorization_url);
    const allowed=provider==='google'?'https://accounts.google.com/o/oauth2/v2/auth':'https://kauth.kakao.com/oauth/authorize';
    if(target.origin+target.pathname!==allowed||target.username||target.password||target.hash||!secret(data.flow_token))throw Error('Invalid authorization response');
    return redirect(target.href,[setCookie(flowName,data.flow_token,600,flowPath,production),setCookie(returnName,returnTo,600,flowPath,production)]);
   }catch{return redirect(retry('unavailable',returnTo),[clear,clearReturn]);}
  }
  if(path[2]==='callback'&&method==='GET'){
   const query=new URL(request.url).searchParams,flow=cookie(request,flowName),code=query.get('code'),state=query.get('state');
   const cancelled=query.get('error')==='access_denied';
   const failed=()=>redirect(retry(cancelled?'cancelled':'oauth_failed',cookie(request,returnName)),[clear,clearReturn]);
   if(query.has('error')||query.getAll('code').length!==1||query.getAll('state').length!==1||!code||code.length>4096||!state||state.length>256||!secret(flow))return failed();
   try{const result=await call(`/oauth/${provider}/finish`,undefined,{code,state,flow_token:flow});if(!result.ok)return failed();const data=await result.json();publicCustomer(data.customer);
    if(data.customer.provider!==provider||!secret(data.session_token)||!Number.isSafeInteger(data.expires_in)||data.expires_in<1||data.expires_in>SESSION_SECONDS)throw Error('Invalid session response');
    return redirect(origin+safeCustomerReturn(data.return_to),[clear,clearReturn,setCookie(CUSTOMER_COOKIE,data.session_token,data.expires_in,'/',production)]);
   }catch{return failed();}
  }
  return failure(404);
 }
 try{
  if(path.length===1&&path[0]==='providers'&&method==='GET'){
   const result=await call('/providers');if(!result.ok)return failure(503);const data=await result.json();
   if(!Array.isArray(data.providers))throw Error('Invalid providers');
   return reply({providers:providers.map(id=>({id,enabled:data.providers.some((p:{id?:unknown;enabled?:unknown})=>p?.id===id&&p.enabled===true)}))});
  }
  const token=cookie(request,CUSTOMER_COOKIE);if(!secret(token))return failure(401);
  if(path.length===1&&path[0]==='me'&&method==='GET'){const result=await call('/me',token);if(!result.ok)return failure(result.status);return reply({customer:publicCustomer((await result.json()).customer)});}
  if(path.length===1&&path[0]==='logout'&&method==='POST'){
   const result=await call('/logout',token,{});if(!result.ok&&result.status!==401)return failure(result.status);
   const response=reply({ok:true});response.headers.append('Set-Cookie',setCookie(CUSTOMER_COOKIE,'',0,'/',production));return response;
  }
  const sessionGuard=createHash('sha256').update('cart-session:'+token).digest('hex');
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if(path[0]==='inquiries'&&(path.length===1||(path.length===2&&uuid.test(path[1])))&&(method==='GET'||(method==='PUT'&&path.length===2))){
   const {parseInquiry,parseInquiryList}=await import('./inquiries.ts');let body:Record<string,unknown>|undefined;
   if(method==='PUT'){if(request.headers.get('x-cart-session')!==sessionGuard)return failure(409);try{body=await readClaimBody(request,32768)}catch{return failure(422)}}
   const q=new URLSearchParams();if(path.length===1){for(const key of ['page','q','category','status']){const value=new URL(request.url).searchParams.get(key);if(value)q.set(key,value)}}
   const result=await call('/'+path.join('/')+(q.size?'?'+q:''),token,body,method);
   if(!result.ok)return reply({error:result.status===401?'로그인이 필요합니다.':result.status===409?'이미 접수된 내용과 다릅니다. 문의 목록을 확인해 주세요.':result.status===422?'문의 유형과 제목·내용의 길이를 확인해 주세요.':result.status===404?'문의를 찾을 수 없습니다.':'문의를 처리하지 못했어요. 입력은 유지됩니다.'},[401,403,404,409,422].includes(result.status)?result.status:503);
   const raw=await result.json();const data=path.length===1?parseInquiryList(raw):parseInquiry(raw);if(path.length===2&&'id' in data&&data.id!==path[1])return failure(503);return reply({...data,session_guard:sessionGuard});
  }
  const isClaim=path[0]==='claims'&&(path.length===1||(path.length===2&&uuid.test(path[1])))&&['GET','POST'].includes(method);
  const isClaimContext=path[0]==='claim-context'&&path.length===2&&uuid.test(path[1])&&method==='GET';
  if(isClaim||isClaimContext){
   const {parseClaims,parseClaimDetail,parseClaimContext,parseClaimPhoto}=await import('./order-claims.ts');
   let body:Record<string,unknown>|undefined;
   if(method==='POST'){
    if(request.headers.get('x-cart-session')!==sessionGuard)return claimFailure(409);
    try{body=await readClaimBody(request,path.length===1?9*1024*1024:16384);
     if(path.length===1&&body.photos!==undefined){if(!Array.isArray(body.photos)||body.photos.length>3)throw Error('Invalid photos');body.photos.forEach(parseClaimPhoto)}
    }catch{return claimFailure(422)}
   }
   const q=new URLSearchParams();if(path.length===1&&method==='GET'){const source=new URL(request.url).searchParams;for(const key of ['cursor','status','order_id','limit']){const value=source.get(key);if(value)q.set(key,value)}}
   const result=await call('/'+path.join('/')+(q.size?'?'+q:''),token,body,method);if(!result.ok)return claimFailure(result.status);
   const raw=await result.json();
   if(isClaimContext){const context=parseClaimContext(raw);if(context.order.id!==path[1])return failure(503);return reply({...context,session_guard:sessionGuard})}
   if(path.length===1&&method==='GET')return reply(parseClaims(raw));
   const detail=parseClaimDetail(raw);if(path.length===2&&detail.id!==path[1])return failure(503);
   return reply({...detail,session_guard:sessionGuard},result.status);
  }
  if(path[0]==='sales-orders'&&path.length===3&&uuid.test(path[1])&&path[2]==='cancel'&&method==='POST'){
   if(request.headers.get('x-cart-session')!==sessionGuard)return failure(409);
   let body;try{body=await readBody(request);}catch{return failure(422);}
   if(Object.keys(body).length!==1||typeof body.request_id!=='string'||!uuid.test(body.request_id))return failure(422);
   const result=await call('/'+path.join('/'),token,{request_id:body.request_id});if(!result.ok)return failure(result.status);
   const {parseOrderDetail}=await import('./sales-orders.ts');
   const order=parseOrderDetail(await result.json());
   if(order.id!==path[1]||!['cancelled','expired'].includes(order.status))return failure(503);
   return reply({...order,session_guard:sessionGuard});
  }
  if(path[0]==='sales-orders'&&method==='GET'&&(path.length===1||(path.length===2&&/^[a-f0-9-]{36}$/.test(path[1])))){
   const {parseSalesOrders,parseOrderDetail}=await import('./sales-orders.ts');const q=new URLSearchParams();const source=new URL(request.url).searchParams;for(const key of ['cursor','status','date_from','date_to','payment_status','fulfillment_status','q']){const value=source.get(key);if(value)q.set(key,value)}
   const result=await call('/'+path.join('/')+(path.length===1?'?'+q:''),token);if(!result.ok)return failure(result.status);const raw=await result.json();if(path.length===1)return reply(parseSalesOrders(raw));const detail=parseOrderDetail(raw);if(detail.id!==path[1])return failure(503);return reply({...detail,session_guard:sessionGuard});
  }
  const isCart=path.length===1&&path[0]==='cart'&&method==='GET';
  const isItem=path.length===3&&path[0]==='cart'&&path[1]==='items'&&/^[A-Za-z0-9_-]{1,128}$/.test(path[2])&&['PUT','DELETE'].includes(method);
  const cartAction=path.length===2&&path[0]==='cart'&&method==='POST'&&['change-option','remove-selection'].includes(path[1]);
  const isCheckout=path[0]==='checkouts'&&((path.length===1&&['GET','POST'].includes(method))||(path.length===2&&/^[a-f0-9-]{36}$/.test(path[1])&&['GET','PUT'].includes(method))||(path.length===3&&/^[a-f0-9-]{36}$/.test(path[1])&&path[2]==='payment'&&method==='POST'));
  const isAccount=(path.length===1&&path[0]==='account'&&['GET','PUT'].includes(method))||(path[0]==='addresses'&&((path.length===1&&method==='POST')||(path.length===2&&/^[a-f0-9-]{36}$/.test(path[1])&&['PUT','DELETE'].includes(method))));
  if(!isCart&&!isItem&&!cartAction&&!isCheckout&&!isAccount)return failure(404);
  let body:Record<string,unknown>|undefined;
  if(method!=='GET'){
   if(request.headers.get('x-cart-session')!==sessionGuard)return failure(409);
   const checkoutCreate=isCheckout&&path.length===1&&method==='POST';
   try{body=await readBody(request,cartAction||checkoutCreate||path[2]==='payment'?32768:4096);}catch{return failure(422);}
   if(cartAction){
    if(!Number.isSafeInteger(body.version)||Number(body.version)<0||typeof body.request_id!=='string'||!uuid.test(body.request_id))return failure(422);
    if(path[1]==='remove-selection'){
     if(Object.keys(body).length!==3||!validSkuSelection(body.sku_ids))return failure(422);
    }else if(Object.keys(body).length!==4||!isCartSku(body.sku_id)||!isCartSku(body.target_sku_id)||body.sku_id===body.target_sku_id)return failure(422);
   }
   if(checkoutCreate&&'sku_ids' in body&&(Object.keys(body).length!==4||body.source!=='cart'||
      !validSkuSelection(body.sku_ids)||!Number.isSafeInteger(body.cart_version)||Number(body.cart_version)<0||
      typeof body.request_id!=='string'||!uuid.test(body.request_id)))return failure(422);
  }
  const result=await call('/'+path.join('/'),token,body,method);if(!result.ok)return failure(result.status);
  const cart=await result.json();
  if(isCheckout && path[2]==='payment'){
   const {parseOrderDetail}=await import('./sales-orders.ts');
   return reply(parseOrderDetail(cart),result.status);
  }
  if(isAccount){const {parseAccount}=await import('./customer-account.ts');return reply({...parseAccount(cart),session_guard:sessionGuard});}
  if(isCheckout){
   const {parseCheckout,parseCheckouts}=await import('./customer-checkout.ts');
   if(path.length===1&&method==='GET')return reply({checkouts:parseCheckouts(cart).map(c=>({...c,session_guard:sessionGuard}))});
   const checkout=parseCheckout(cart);
   if(path.length===1&&method==='POST'&&Array.isArray(body?.sku_ids)){
    const selected=new Set(body.sku_ids);
    if(checkout.items.length!==selected.size||checkout.items.some(item=>!selected.has(item.sku_id)))return failure(503);
   }
   return reply({...checkout,session_guard:sessionGuard});
  }
  // Public cart parsing is supplied by the shared UI contract; never expose arbitrary upstream data.
  const {parseCart}=await import('./customer-shopping.ts');return reply({...parseCart(cart),session_guard:sessionGuard});
 }catch{return failure(503);}
}
