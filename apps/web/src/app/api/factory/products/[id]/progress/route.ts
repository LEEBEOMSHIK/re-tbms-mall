import {factoryProxy} from '@/lib/factory-proxy';
import {parseProductProgress} from '@/lib/factory';
export const dynamic='force-dynamic';
async function forward(request:Request,params:Promise<{id:string}>,method:'GET'|'PUT'){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'잘못된 상품입니다.'},{status:404,headers:{'Cache-Control':'no-store'}});
 return factoryProxy(request,`products/${id}/progress`,method,raw=>{const result=parseProductProgress(raw);if(result.product_id!==id)throw Error('Unexpected product progress');return result;});
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return forward(request,params,'GET');}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return forward(request,params,'PUT');}
