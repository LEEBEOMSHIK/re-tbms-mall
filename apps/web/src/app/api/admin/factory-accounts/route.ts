import {catalogProxy} from '@/lib/catalog-proxy';
import {parseFactoryAccount} from '@/lib/factory';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(request:Request){return catalogProxy(request,'factory-accounts','POST',parseFactoryAccount,65536);}
