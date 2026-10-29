import {catalogProxy} from '@/lib/catalog-proxy';
import {parseInventoryOverview} from '@/lib/inventory-overview';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){return catalogProxy(request,'inventory/overview','GET',parseInventoryOverview);}
