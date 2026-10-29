import { catalogProxy } from '@/lib/catalog-proxy';
import { parseOptionValue } from '@/lib/catalog';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 기준정보입니다.'},{status:404});
  return catalogProxy(request,`option-values/${id}`,'PUT',value=>{const parsed=parseOptionValue(value);if(parsed.id!==id)throw Error('Unexpected option value');return parsed;});
}
