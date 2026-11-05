import {getAdminSession,adminApiBase} from '@/lib/admin-session';
import {getFactorySession,factoryApiBase} from '@/lib/factory-session';
import {sameOrigin} from '@/lib/admin-session-core';
import {readBrandBody} from '@/lib/brand-about';
import {LOGO_ID,parseLogoFile,parseLogoState,parseLogoPublished} from '@/lib/brand-library-contract';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function libraryProxy(request:Request,role:'admin'|'factory',parts:string[]){
 const suffix=parts.join('/'),isFile=parts.length===2&&parts[0]==='assets'&&LOGO_ID.test(parts[1]);
 const method=request.method;
 if(!(isFile&&method==='GET')&&!(suffix===''&&(method==='GET'||role==='admin'&&method==='PUT'))&&!(role==='admin'&&method==='POST'&&['publish','assets'].includes(suffix)))return reply({error:'허용하지 않는 요청입니다.'},404);
 const session=role==='admin'?await getAdminSession():await getFactorySession();if(!session)return reply({error:'로그인이 필요합니다.'},401);
 if(method!=='GET'&&!sameOrigin(request))return reply({error:'허용하지 않는 요청입니다.'},403);
 let body:string|undefined;
 if(method!=='GET'){try{body=new TextDecoder().decode(await readBrandBody(request,suffix==='assets'?3*1024*1024:32768));JSON.parse(body);}catch{return reply({error:'파일 또는 입력 크기를 확인해 주세요.'},422);}}
 try{
  const download=isFile&&new URL(request.url).searchParams.get('download')==='1';
  const response=await fetch(`${role==='admin'?adminApiBase():factoryApiBase()}/api/v1/${role}/brand-library${suffix?'/'+suffix:''}${download?'?download=true':''}`,{method,body,cache:'no-store',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${session.token}`,...(body?{'Content-Type':'application/json'}:{})}});
  if(!response.ok)return reply({error:'요청을 처리하지 못했습니다.'},[401,403,404,409,413,422].includes(response.status)?response.status:503);
  if(isFile){if(response.headers.get('content-type')!=='image/png')throw Error();return new Response(Buffer.from(await readBrandBody(response,2*1024*1024)),{headers:{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':response.headers.get('content-disposition')||'inline'}});}
  const data=JSON.parse(new TextDecoder().decode(await readBrandBody(response,1024*1024)));
  return reply(suffix==='assets'?parseLogoFile(data):role==='admin'?parseLogoState(data):parseLogoPublished(data),response.status);
 }catch{return reply({error:'서버 응답을 확인하지 못했습니다.'},503);}
}
