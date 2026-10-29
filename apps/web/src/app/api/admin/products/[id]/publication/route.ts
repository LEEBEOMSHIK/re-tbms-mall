import {catalogProxy} from '@/lib/catalog-proxy';
import {parsePublication} from '@/lib/publication';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return catalogProxy(request,`products/${encodeURIComponent(id)}/publication`,'GET',parsePublication)}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return catalogProxy(request,`products/${encodeURIComponent(id)}/publication`,'PUT',parsePublication)}
