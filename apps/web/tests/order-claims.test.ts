import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseClaimDetail,parseClaims,parseClaimPhoto,parseClaimContext} from '../src/lib/order-claims.ts';
import {safeCustomerReturn as safeBrowserReturn} from '../src/lib/customer-shopping.ts';
import {customerRoute,CUSTOMER_COOKIE,safeCustomerReturn} from '../src/lib/customer-auth-core.ts';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const summary={id,order_id:id,order_number:'TEST-CLAIM',line_id:id,product_name:'합성 상품',color:'검정',size:'M',kind:'exchange',status:'requested',quantity:1,reason:'size_color',version:1,created_at:'2026-11-07T00:00:00Z',updated_at:'2026-11-07T00:00:00Z'};
const detail={...summary,description:'사이즈가 맞지 않아 교환 요청합니다.',received_date:'2026-11-07',shipping:{recipient:'합성 수령인',phone:'01012345678',postal_code:'12345',address:'합성 주소',address_detail:'합성 상세',memo:''},target_sku_id:'SKU-M',target_color:'검정',target_size:'M',conversion_from:null,photos:['data:image/png;base64,YQ=='],events:[{id,action:'create',status:'requested',note:'접수',actor:'customer',at:summary.created_at}],customer_actions:['withdraw'],admin_actions:['review']};
const origin='http://localhost:3100',token='a'.repeat(43),guard=createHash('sha256').update('cart-session:'+token).digest('hex');
function request(path:string,method='GET',body?:unknown,headers:Record<string,string>={}){return new Request(origin+'/api/customer/'+path,{method,headers:{host:'localhost:3100',cookie:`${CUSTOMER_COOKIE}=${token}`,origin,'content-type':'application/json','x-cart-session':guard,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})})}
test('claim parsers strip private fields from detail and summary lists',()=>{
 const parsed=parseClaimDetail({...detail,internal_token:token,shipping:{...detail.shipping,internal_token:token}});
 assert.equal(JSON.stringify(parsed).includes(token),false);
 const page=parseClaims({claims:[detail],next_cursor:null,internal_token:token});
 assert.equal('shipping' in page.claims[0],false);assert.equal('photos' in page.claims[0],false);assert.equal('description' in page.claims[0],false);
});
test('claim parsers reject malformed state, quantity, identifiers, arrays and photo schemes',()=>{
 for(const patch of [{status:'completed'},{quantity:0},{quantity:1.5},{version:0},{id:'private'},{photos:Array(4).fill(detail.photos[0])},{photos:['https://private.test/photo']},{photos:['data:image/svg+xml;base64,YQ==']},{customer_actions:['refund_everything']}])assert.throws(()=>parseClaimDetail({...detail,...patch}));
 const max='data:image/jpeg;base64,'+Buffer.alloc(2*1024*1024).toString('base64');assert.equal(parseClaimPhoto(max),max);
 assert.throws(()=>parseClaimPhoto('data:image/jpeg;base64,'+Buffer.alloc(2*1024*1024+1).toString('base64')));
 assert.throws(()=>parseClaims({claims:Array(51).fill(summary),next_cursor:null}));
});
test('claim detail retains target option snapshot and inspected conversion origin',()=>{
 const parsed=parseClaimDetail({...detail,status:'inspected',customer_actions:[],admin_actions:['queue_exchange','request_conversion']});
 assert.equal(parsed.target_color,'검정');assert.equal(parsed.target_size,'M');assert.equal(parsed.status,'inspected');
 assert.equal(parseClaimDetail({...detail,status:'received',admin_actions:['inspect']}).admin_actions[0],'inspect');
 assert.equal(parseClaimDetail({...detail,status:'conversion_requested',conversion_from:'inspected',customer_actions:['convert_return'],admin_actions:[]}).conversion_from,'inspected');
 const converted=parseClaimDetail({...detail,kind:'return',status:'inspected',target_sku_id:null,target_color:null,target_size:null,conversion_from:null});
 assert.equal(converted.target_color,null);assert.equal(converted.target_size,null);
 for(const patch of [{target_color:123},{target_size:'x'.repeat(101)},{conversion_from:'requested'}])assert.throws(()=>parseClaimDetail({...detail,...patch}));
});
test('customer claims require same origin, valid session and matching session guard before writes',async()=>{
 let calls=0;const options={origin,apiBase:'http://api.test',fetcher:async()=>{calls++;return Response.json(detail)}};
 for(const [headers,status] of [[{origin:'https://evil.test'},403],[{cookie:''},401],[{'x-cart-session':''},409],[{'x-cart-session':'stale'},409]] as [Record<string,string>,number][]){const result=await customerRoute(request('claims','POST',{},headers),['claims'],options);assert.equal(result.status,status)}
 assert.equal(calls,0);
});
test('customer claims detail binds returned id, strips secrets and returns session guard',async()=>{
 let authorization='';const response=await customerRoute(request('claims/'+id),['claims',id],{origin,apiBase:'http://api.test',fetcher:async(_url,init)=>{authorization=new Headers(init?.headers).get('Authorization')!;return Response.json({...detail,session_token:token})}});
 assert.equal(response.status,200);assert.equal(authorization,'Bearer '+token);const json=await response.json();assert.equal(json.session_guard,guard);assert.equal(parseClaimDetail(json).session_guard,guard);assert.equal(JSON.stringify(json).includes(token),false);assert.equal(response.headers.get('cache-control'),'no-store');
 const mismatch=await customerRoute(request('claims/'+other),['claims',other],{origin,apiBase:'http://api.test',fetcher:async()=>Response.json(detail)});assert.equal(mismatch.status,503);
});
test('customer claims creation preserves 201 and action conflict has sanitized error',async()=>{
 const body={request_id:id,order_id:id,photos:detail.photos};let sent:unknown;
 const response=await customerRoute(request('claims','POST',body),['claims'],{origin,apiBase:'http://api.test',fetcher:async(_url,init)=>{sent=JSON.parse(init?.body as string);return Response.json(detail,{status:201})}});
 assert.equal(response.status,201);assert.deepEqual(sent,body);
 const conflict=await customerRoute(request('claims/'+id,'POST',{request_id:id,version:1,action:'withdraw'}),['claims',id],{origin,apiBase:'http://api.test',fetcher:async()=>Response.json({detail:'internal token '+token},{status:409})});assert.equal(conflict.status,409);assert.equal((await conflict.text()).includes(token),false);
});
test('claim upload boundaries reject oversized streamed bodies, content length and photo count before API',async()=>{
 let calls=0;const options={origin,apiBase:'http://api.test',fetcher:async()=>{calls++;return Response.json(detail)}};
 for(const req of [request('claims','POST',{}, {'content-length':String(9*1024*1024+1)}),request('claims','POST',{description:'x'.repeat(9*1024*1024)}),request('claims','POST',{photos:Array(4).fill(detail.photos[0])}),request('claims/'+id,'POST',{note:'x'.repeat(16384)})]){const path=new URL(req.url).pathname.split('/').slice(3);const response=await customerRoute(req,path,options);assert.equal(response.status,422)}
 assert.equal(calls,0);
});
test('claim list forwards only supported query fields and login return preserves safe order',async()=>{
 let target='';const response=await customerRoute(request('claims?order_id='+id+'&token=secret&limit=20'),['claims'],{origin,apiBase:'http://api.test',fetcher:async(url)=>{target=String(url);return Response.json({claims:[detail],next_cursor:null})}});
 assert.equal(response.status,200);assert.equal(target,'http://api.test/api/v1/customer/claims?order_id='+id+'&limit=20');
 assert.equal(safeCustomerReturn('/account/claims/new?order_id='+id),'/account/claims/new?order_id='+id);assert.equal(safeCustomerReturn('/account/claims/'+id),'/account/claims/'+id);
 assert.equal(safeBrowserReturn('/account/claims/new?order_id='+id),'/account/claims/new?order_id='+id);
 for(const value of ['/account/claims/new?order_id=bad','/account/claims/new?order_id='+id+'&order_id='+id,'/cart?order_id='+id,'/account/claims/new?order_id='+id+'&redirect=https://evil.test'])assert.equal(safeCustomerReturn(value),'/cart');
});
test('claim context preserves server eligibility and stock without private fields and binds order',async()=>{
 const order={id,number:'TEST-CLAIM',created_at:summary.created_at,status:'confirmed',payment_status:'succeeded',fulfillment_status:'delivered',goods_total:10000,shipping_total:0,grand_total:10000,item_count:1,summary:'합성 상품',is_demo:true,lines:[{id,product_name:'합성 상품',color:'검정',size:'M',quantity:1,unit_price:10000,line_total:10000}],shipping:detail.shipping,shipments:[],events:[]};
 const context={order,eligible:true,ineligibility_reason:null,lines:[{line_id:id,remaining_quantity:1,exchange_options:[{sku_id:'SKU-L',color:'검정',size:'L',available_quantity:0,private:'secret'}]}],private:'secret'};
 assert.equal(JSON.stringify(parseClaimContext(context)).includes('secret'),false);
 assert.throws(()=>parseClaimContext({...context,lines:[{...context.lines[0],remaining_quantity:2}]}));
 assert.throws(()=>parseClaimContext({...context,lines:[{...context.lines[0],line_id:other}]}));
 const options={origin,apiBase:'http://api.test',fetcher:async()=>Response.json(context)};
 const response=await customerRoute(request('claim-context/'+id),['claim-context',id],options);assert.equal(response.status,200);const data=await response.json();assert.equal(data.session_guard,guard);assert.equal(parseClaimContext(data).session_guard,guard);assert.equal(data.lines[0].exchange_options[0].available_quantity,0);
 const mismatch=await customerRoute(request('claim-context/'+other),['claim-context',other],options);assert.equal(mismatch.status,503);
});
