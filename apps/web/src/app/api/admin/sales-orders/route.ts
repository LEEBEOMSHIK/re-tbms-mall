import {catalogProxy} from '@/lib/catalog-proxy';
import {parseSalesOrders} from '@/lib/sales-orders';
export const dynamic='force-dynamic';
export async function GET(request:Request){const source=new URL(request.url).searchParams;const q=new URLSearchParams();for(const key of ['cursor','status','search_field','q','date_from','date_to','payment_status','fulfillment_status']){const value=source.get(key);if(value)q.set(key,value)}return catalogProxy(request,'sales-orders?'+q,'GET',parseSalesOrders)}
