import {catalogProxy} from '@/lib/catalog-proxy';
import {parseProductImage,parseProductImages} from '@/lib/product-images';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 상품입니다.'},{status:404});return catalogProxy(request,`products/${id}/images`,'GET',value=>{const result=parseProductImages(value);if(result.images.some(image=>image.product_id!==id))throw Error('Unexpected product');return result;});}
export async function POST(request:Request,{params}:Context){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 상품입니다.'},{status:404});return catalogProxy(request,`products/${id}/images`,'POST',value=>{const image=parseProductImage(value);if(image.product_id!==id)throw Error('Unexpected product');return image;},3*1024*1024);}
