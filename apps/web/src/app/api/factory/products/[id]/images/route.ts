import {factoryProxy} from '@/lib/factory-proxy';
import {parseProductImages} from '@/lib/product-images';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 상품입니다.'},{status:404,headers:{'Cache-Control':'no-store'}});return factoryProxy(request,`products/${id}/images`,'GET',raw=>{const result=parseProductImages(raw);if(result.images.some(image=>image.product_id!==id||image.kind!=='design'))throw Error('Unexpected shared image');return result;});}
