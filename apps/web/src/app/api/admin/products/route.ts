import { catalogProxy } from '@/lib/catalog-proxy';
import { parseProduct } from '@/lib/catalog';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(request:Request){return catalogProxy(request,'products','POST',parseProduct);}
