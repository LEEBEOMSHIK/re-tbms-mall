import { catalogProxy } from '@/lib/catalog-proxy';
import { parseCatalog } from '@/lib/catalog';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(request:Request){return catalogProxy(request,'catalog','GET',parseCatalog);}
