import {catalogProxy} from '@/lib/catalog-proxy';
import {parseShipments} from '@/lib/shipments';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(request:Request){return catalogProxy(request,'shipments','GET',parseShipments);}
