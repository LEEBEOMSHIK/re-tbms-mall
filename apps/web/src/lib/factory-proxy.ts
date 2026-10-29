import {cookies} from 'next/headers';
import {factoryApiBase,getFactorySession} from './factory-session';
import {FACTORY_SESSION_COOKIE,factoryCookieOptions,factorySameOrigin,revokeFactorySession} from './factory-session-core';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function factoryProxy(request:Request,path:string,method:'GET'|'PUT'|'POST',parse:(value:unknown)=>unknown,options:{preserveRateLimit?:boolean;maxBodyLength?:number}={}){
 const session=await getFactorySession();if(!session)return reply({error:'공장 로그인이 필요합니다.'},401);
 if(method!=='GET'&&!factorySameOrigin(request))return reply({error:'허용하지 않는 요청입니다.'},403);
 let body:string|undefined;
 if(method!=='GET'){try{body=await request.text();if(body.length>(options.maxBodyLength??4096))return reply({error:'입력을 확인해 주세요.'},422);JSON.parse(body);}catch{return reply({error:'입력 형식을 확인해 주세요.'},422);}}
 try{const response=await fetch(`${factoryApiBase()}/api/v1/factory/${path}`,{method,body,cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${session.token}`,...(body!==undefined?{'Content-Type':'application/json'}:{})}});
 if(response.status===401||response.status===403){const jar=await cookies();revokeFactorySession(jar.get(FACTORY_SESSION_COOKIE)?.value);jar.set(FACTORY_SESSION_COOKIE,'',{...factoryCookieOptions(),maxAge:0});return reply({error:'공장 로그인이 만료되었거나 접근 권한이 없습니다.'},401);}
 if(!response.ok)return reply({error:'요청을 처리하지 못했습니다.'},([404,409,422].includes(response.status)||(options.preserveRateLimit&&response.status===429))?response.status:503);
 return reply(parse(await response.json()),response.status);
 }catch{return reply({error:'공장 서버에 연결하지 못했습니다.'},503);}
}
