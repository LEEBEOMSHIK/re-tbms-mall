import {catalogProxy} from '@/lib/catalog-proxy';
import {parseProductProgress} from '@/lib/factory';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
async function handle(request:Request,context:Context,method:'GET'|'PUT'){const {id}=await context.params;if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 상품입니다.'},{status:404});return catalogProxy(request,`products/${id}/progress`,method,raw=>{const data=parseProductProgress(raw);if(data.product_id!==id)throw Error('Unexpected product');return data;});}
export async function GET(request:Request,context:Context){return handle(request,context,'GET')}
export async function PUT(request:Request,context:Context){return handle(request,context,'PUT')}
