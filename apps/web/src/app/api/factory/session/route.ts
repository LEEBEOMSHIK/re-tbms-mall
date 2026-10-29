import {cookies} from 'next/headers';
import {factoryApiBase,getFactorySession} from '@/lib/factory-session';
import {FACTORY_SESSION_COOKIE,createFactorySession,revokeFactorySession,factoryCookieOptions,factorySameOrigin} from '@/lib/factory-session-core';
import {loadFactoryTestCredentials} from '@/lib/factory-test-login';
import {testLoginAllowed,SESSION_COOKIE,revokeSession,sessionCookieOptions} from '@/lib/admin-session-core';
import {parseFactoryLogin} from '@/lib/factory';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
 if(!factorySameOrigin(request))return reply({error:'허용하지 않는 요청입니다.'},403);
 let input:{username:string;password:string};try{const text=await request.text();if(text.length>4096)throw Error('Too large');const value=JSON.parse(text);if(value?.mode==='test'){if(!testLoginAllowed(request))return reply({error:'테스트 로그인은 로컬 개발에서만 사용할 수 있습니다.'},403);const credentials=await loadFactoryTestCredentials(request);if(!credentials)return reply({error:'공장 테스트 자료를 먼저 준비해 주세요.'},503);input=credentials;}else{if(!value||typeof value.username!=='string'||!value.username.trim()||value.username.length>64||typeof value.password!=='string'||!value.password||value.password.length>128)throw Error('Invalid input');input={username:value.username.trim(),password:value.password};}}catch{return reply({error:'아이디와 비밀번호를 확인해 주세요.'},422);}
 try{const response=await fetch(`${factoryApiBase()}/api/v1/factory/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)return reply({error:'로그인할 수 없습니다.'},[401,403,422,429].includes(response.status)?response.status:503);
 const login=parseFactoryLogin(await response.json());if(!login.account.is_active)throw Error('Inactive account');const expiresAt=Date.parse(login.expires_at);const id=createFactorySession(login.token,expiresAt);const jar=await cookies();revokeFactorySession(jar.get(FACTORY_SESSION_COOKIE)?.value);jar.set(FACTORY_SESSION_COOKIE,id,{...factoryCookieOptions(),maxAge:Math.max(1,Math.min(factoryCookieOptions().maxAge,Math.floor((expiresAt-Date.now())/1000)))});
 revokeSession(jar.get(SESSION_COOKIE)?.value);jar.set(SESSION_COOKIE,'',{...sessionCookieOptions(),maxAge:0});
 return reply({authenticated:true});
 }catch{return reply({error:'로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);}
}
export async function DELETE(request:Request){
 if(!factorySameOrigin(request))return reply({error:'허용하지 않는 요청입니다.'},403);
 const session=await getFactorySession();const jar=await cookies();revokeFactorySession(jar.get(FACTORY_SESSION_COOKIE)?.value);jar.set(FACTORY_SESSION_COOKIE,'',{...factoryCookieOptions(),maxAge:0});
 if(session){try{await fetch(`${factoryApiBase()}/api/v1/factory/logout`,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(5000),headers:{Authorization:`Bearer ${session.token}`}});}catch{/* Local session is revoked even when upstream is unavailable. */}}
 return reply({authenticated:false});
}
