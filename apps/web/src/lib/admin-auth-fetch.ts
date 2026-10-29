export const ADMIN_EXPIRED_EVENT='tbms:admin-session-expired';
export function isAdminUnauthorized(input:RequestInfo|URL,status:number,origin:string){
 if(status!==401)return false;
 try{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,origin);return url.origin===origin&&url.pathname.startsWith('/api/admin/')&&url.pathname!=='/api/admin/session';}catch{return false;}
}
export const adminAuthFetch:typeof fetch=async(input,init)=>{
 const response=await fetch(input,init);
 if(typeof window!=='undefined'&&isAdminUnauthorized(input,response.status,window.location.origin))window.dispatchEvent(new Event(ADMIN_EXPIRED_EVENT));
 return response;
};
