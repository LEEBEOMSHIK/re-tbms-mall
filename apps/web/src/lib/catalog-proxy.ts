import { getAdminSession,adminApiBase } from './admin-session';
import { sameOrigin } from './admin-session-core';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function catalogProxy(request:Request,path:string,method:'GET'|'POST'|'PUT'|'DELETE',parse:(v:unknown)=>unknown,maxBodyLength=16384){
  const session=await getAdminSession();if(!session)return reply({error:'관리자 로그인이 필요합니다.'},401);
  if(method!=='GET'&&!sameOrigin(request))return reply({error:'허용하지 않는 요청입니다.'},403);
  let body:string|undefined;
  if(method!=='GET'){try{body=await request.text();if(body.length>maxBodyLength)return reply({error:'입력이 너무 깁니다.'},422);JSON.parse(body);}catch{return reply({error:'입력 형식을 확인해 주세요.'},422);}}
  try{const r=await fetch(`${adminApiBase()}/api/v1/admin/${path}`,{method,body,cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${session.token}`,...(body!==undefined?{'Content-Type':'application/json'}:{})}});
    if(!r.ok)return reply({error:'요청을 처리하지 못했습니다.'},[401,404,409,422].includes(r.status)?r.status:503);
    return reply(parse(await r.json()),r.status);
  }catch{return reply({error:'관리 서버에 연결하지 못했습니다.'},503);}
}

