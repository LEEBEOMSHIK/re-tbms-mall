import { catalogProxy } from '@/lib/catalog-proxy';
import { parseSelectedSkuBatch } from '@/lib/catalog';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(request:Request){return catalogProxy(request,'skus/selected-batch','POST',parseSelectedSkuBatch,65536);}

