import {catalogProxy} from '@/lib/catalog-proxy';
import {parseProductionRequest} from '@/lib/factory';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(request:Request){return catalogProxy(request,'production-requests','POST',parseProductionRequest,65536);}
