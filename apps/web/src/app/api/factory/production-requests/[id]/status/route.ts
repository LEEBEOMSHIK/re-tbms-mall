import {factoryProxy} from '@/lib/factory-proxy';
import {parseProductionRequest} from '@/lib/factory';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 요청입니다.'},{status:404,headers:{'Cache-Control':'no-store'}});return factoryProxy(request,`production-requests/${id}/status`,'PUT',raw=>{const result=parseProductionRequest(raw);if(result.id!==id)throw Error('Unexpected request');return result;});}
