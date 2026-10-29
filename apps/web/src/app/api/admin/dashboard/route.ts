import { getAdminSession, adminApiBase } from '@/lib/admin-session';
import { parseDashboard } from '@/lib/dashboard';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
  const session=await getAdminSession();
  if(!session)return reply({error:'관리자 로그인이 필요합니다.'},401);
  try{
    const response=await fetch(`${adminApiBase()}/api/v1/admin/dashboard`,{cache:'no-store',headers:{Authorization:`Bearer ${session.token}`},signal:AbortSignal.timeout(10000)});
    if(!response.ok)return reply({error:'업무 현황을 불러오지 못했습니다.'},response.status===401?401:503);
    return reply(parseDashboard(await response.json()));
  }catch{return reply({error:'업무 현황을 불러오지 못했습니다.'},503);}
}
