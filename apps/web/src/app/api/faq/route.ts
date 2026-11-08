import {adminApiBase} from '@/lib/admin-session';
import {parseFaqList} from '@/lib/faq';
export const dynamic='force-dynamic';
export async function GET(){try{const r=await fetch(adminApiBase()+'/api/v1/faq',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();return Response.json({items:parseFaqList(await r.json()).filter(x=>x.published)},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'질문을 불러오지 못했습니다.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
