import {catalogProxy} from '@/lib/catalog-proxy';
import {parseAdminFactoryWorkspace} from '@/lib/factory';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(request:Request){return catalogProxy(request,'factory-workspace','GET',parseAdminFactoryWorkspace,65536);}
