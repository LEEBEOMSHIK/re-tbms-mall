import {catalogProxy} from '@/lib/catalog-proxy';
import {parseSupplier} from '@/lib/catalog';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 공급처입니다.'},{status:404});
 return catalogProxy(request,'suppliers/'+id,'PUT',value=>{const parsed=parseSupplier(value);if(parsed.id!==id)throw Error('Unexpected supplier');return parsed;});
}
