import {catalogProxy} from '@/lib/catalog-proxy';
import {parseShipment} from '@/lib/shipments';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return catalogProxy(request,`shipments/${encodeURIComponent(id)}/receive`,'PUT',parseShipment,65536);}
