import {catalogProxy} from '@/lib/catalog-proxy';
import {parseAdminReviews} from '@/lib/reviews';
export const dynamic='force-dynamic';
export async function GET(request:Request){return catalogProxy(request,'reviews','GET',parseAdminReviews)}
