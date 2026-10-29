import {catalogProxy} from '@/lib/catalog-proxy';
import {parseSku} from '@/lib/catalog';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'색상·사이즈를 찾을 수 없습니다.'},{status:404});return catalogProxy(request,`skus/${id}/settings`,'PUT',raw=>{if(!raw||typeof raw!=='object'||!('is_active' in raw)||typeof raw.is_active!=='boolean')throw Error('Missing option status');const sku=parseSku(raw);if(sku.id!==id)throw Error('Unexpected option');return sku;});}
