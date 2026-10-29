import { catalogProxy } from '@/lib/catalog-proxy';
import { parseSku } from '@/lib/catalog';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(request:Request){return catalogProxy(request,'skus','POST',parseSku);}
