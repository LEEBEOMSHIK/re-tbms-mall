import {factoryProxy} from '@/lib/factory-proxy';
import {parseFactoryWorkspace} from '@/lib/factory';
export const dynamic='force-dynamic';
export async function GET(request:Request){return factoryProxy(request,'workspace','GET',raw=>{const workspace=parseFactoryWorkspace(raw);if(!workspace.account.is_active||workspace.requests.some(request=>request.supplier_id!==workspace.account.supplier_id||!workspace.products.some(product=>product.id===request.product_id)))throw Error('Unexpected factory scope');return workspace;});}
