import {customerRoute} from '@/lib/customer-auth-core';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function route(request:Request,context:{params:Promise<{path:string[]}>}){
 const {path}=await context.params;
 return customerRoute(request,path,{origin:process.env.CUSTOMER_WEB_ORIGIN||(process.env.NODE_ENV==='production'?'':'http://localhost:3100'),apiBase:process.env.CUSTOMER_API_BASE_URL||process.env.ADMIN_API_BASE_URL||'http://127.0.0.1:8100',production:process.env.NODE_ENV==='production'});
}
export {route as GET,route as POST,route as PUT,route as DELETE};
