import {catalogProxy} from '@/lib/catalog-proxy';
import {parseAdminReview} from '@/lib/reviews';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return catalogProxy(request,`reviews/${encodeURIComponent(id)}`,'GET',parseAdminReview)}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;return catalogProxy(request,`reviews/${encodeURIComponent(id)}`,'PUT',parseAdminReview)}
