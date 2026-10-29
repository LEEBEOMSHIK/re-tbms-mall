import { getAdminSession, adminApiBase } from '@/lib/admin-session';
import { createDesignProxy } from '@/lib/design-proxy-core';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const proxy=createDesignProxy({session:getAdminSession,base:adminApiBase});
type Context={params:Promise<{path?:string[]}>};
async function handler(request:Request,context:Context){return proxy(request,(await context.params).path||[]);}
export {handler as GET,handler as POST,handler as PATCH};
