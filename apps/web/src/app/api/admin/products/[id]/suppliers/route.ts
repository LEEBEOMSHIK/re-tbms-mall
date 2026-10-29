import {catalogProxy} from '@/lib/catalog-proxy';
import {parseProductSuppliers} from '@/lib/factory';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 항목입니다.'},{status:404});return catalogProxy(request,`products/${id}/suppliers`,'PUT',parseProductSuppliers,65536);}
