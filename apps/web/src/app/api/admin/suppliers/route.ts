import {catalogProxy} from '@/lib/catalog-proxy';
import {parseSupplier} from '@/lib/catalog';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(request:Request){return catalogProxy(request,'suppliers','POST',parseSupplier);}
