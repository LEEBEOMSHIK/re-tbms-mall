import { catalogProxy } from '@/lib/catalog-proxy';
import { parseProduct, parseProductDeletion } from '@/lib/catalog';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 상품입니다.'},{status:404});return catalogProxy(request,`products/${id}`,'PUT',parseProduct);}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 상품입니다.'},{status:404});return catalogProxy(request,`products/${id}`,'DELETE',value=>{const result=parseProductDeletion(value);if(result.id!==id)throw new Error('Unexpected product');return result;});}
