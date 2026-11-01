import {catalogProxy} from '@/lib/catalog-proxy';
import {parseOrderDetail} from '@/lib/sales-orders';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return Response.json({error:'주문을 찾을 수 없습니다.'},{status:404});return catalogProxy(request,'sales-orders/'+id,'GET',parseOrderDetail)}
