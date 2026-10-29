import {factoryProxy} from '@/lib/factory-proxy';
import {parseShipment} from '@/lib/shipments';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return factoryProxy(request,`shipments/${encodeURIComponent(id)}`,'GET',parseShipment);}
