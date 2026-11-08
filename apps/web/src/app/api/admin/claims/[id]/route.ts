import {catalogProxy} from '@/lib/catalog-proxy';
import {claimUuid,parseClaimDetail} from '@/lib/order-claims';
export const dynamic='force-dynamic';
async function route(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!claimUuid.test(id))return Response.json({error:'접수를 찾을 수 없습니다.'},{status:404});
 return catalogProxy(request,'claims/'+id,request.method as 'GET'|'POST',raw=>{const detail=parseClaimDetail(raw);if(detail.id!==id)throw Error('Invalid claim');return detail});
}
export {route as GET,route as POST};
