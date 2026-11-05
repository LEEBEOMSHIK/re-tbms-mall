import {libraryProxy} from '@/app/api/brand-library-proxy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
type Context={params:Promise<{path?:string[]}>};
export async function GET(request:Request,context:Context){return libraryProxy(request,'factory',(await context.params).path||[]);}
