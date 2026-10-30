import { adminApiBase, getAdminSession } from '@/lib/admin-session';
import { sameOrigin } from '@/lib/admin-session-core';
import { parseAdminMenu } from '@/lib/admin-menu';
import { readBrandBody } from '@/lib/brand-about';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const reply=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function proxy(request:Request) {
  const session=await getAdminSession();
  if(!session)return reply({error:'관리자 로그인이 필요합니다.'},401);
  if(request.method==='PUT'&&!sameOrigin(request))return reply({error:'허용하지 않는 요청입니다.'},403);
  let body:string|undefined;
  if(request.method==='PUT'){
    try {body=JSON.stringify(parseAdminMenu(JSON.parse(new TextDecoder().decode(await readBrandBody(request,32768)))));}
    catch(error){return reply({error:'그룹 이름과 메뉴 배치, 입력 크기를 확인해 주세요.'},error instanceof Error&&error.message==='Too large'?413:422);}
  }
  try {
    const response=await fetch(`${adminApiBase()}/api/v1/admin/navigation`,{method:request.method,body,cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${session.token}`,...(body?{'Content-Type':'application/json'}:{})}});
    if(!response.ok)return reply({error:'메뉴 설정을 처리하지 못했습니다.'},[401,403,409,413,422].includes(response.status)?response.status:503);
    return reply(parseAdminMenu(JSON.parse(new TextDecoder().decode(await readBrandBody(response,32768)))));
  }catch{return reply({error:'메뉴 설정 응답을 확인하지 못했습니다.'},503);}
}
export async function GET(request:Request){return proxy(request);}
export async function PUT(request:Request){return proxy(request);}
