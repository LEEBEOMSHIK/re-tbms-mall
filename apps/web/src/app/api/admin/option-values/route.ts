import { catalogProxy } from '@/lib/catalog-proxy';
import { parseOptionValue } from '@/lib/catalog';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:Request){return catalogProxy(request,'option-values','POST',parseOptionValue);}
