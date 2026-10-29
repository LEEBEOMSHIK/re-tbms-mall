import {catalogProxy} from '@/lib/catalog-proxy';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function DELETE(request:Request,{params}:{params:Promise<{id:string;imageId:string}>}){const {id,imageId}=await params;if(![id,imageId].every(value=>/^[0-9a-f-]{36}$/i.test(value)))return Response.json({error:'잘못된 이미지입니다.'},{status:404});return catalogProxy(request,`products/${id}/images/${imageId}`,'DELETE',value=>{if(!value||typeof value!=='object'||!('id' in value)||value.id!==imageId)throw Error('Unexpected image');return {id:imageId};});}
