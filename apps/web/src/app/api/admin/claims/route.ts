import {catalogProxy} from '@/lib/catalog-proxy';
import {parseClaims} from '@/lib/order-claims';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const source=new URL(request.url).searchParams,q=new URLSearchParams();
 for(const key of ['cursor','status','order_id','limit']){const value=source.get(key);if(value)q.set(key,value)}
 return catalogProxy(request,'claims?'+q,'GET',parseClaims);
}
