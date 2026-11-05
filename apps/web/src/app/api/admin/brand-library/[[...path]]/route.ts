import {libraryProxy} from '@/app/api/brand-library-proxy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
type Context={params:Promise<{path?:string[]}>};
export async function GET(request:Request,context:Context){return libraryProxy(request,'admin',(await context.params).path||[]);}
export const PUT=GET;
export const POST=GET;
