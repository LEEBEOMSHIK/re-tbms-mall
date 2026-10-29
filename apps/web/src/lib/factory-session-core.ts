import {randomBytes} from 'node:crypto';
export const FACTORY_SESSION_COOKIE='tbms_factory_session';
export const FACTORY_SESSION_SECONDS=8*60*60;
export type FactorySession={token:string;expiresAt:number};
const state=globalThis as typeof globalThis & {tbmsFactorySessions?:Map<string,FactorySession>};
const sessions=state.tbmsFactorySessions??=new Map<string,FactorySession>();
export function createFactorySession(token:string,expiresAt:number,now=Date.now()):string{
 if(!token||!Number.isFinite(expiresAt)||expiresAt<=now)throw Error('Invalid factory session');
 for(const [id,session] of sessions)if(session.expiresAt<=now)sessions.delete(id);
 if(sessions.size>=1000)throw Error('Session capacity reached');
 const id=randomBytes(32).toString('hex');sessions.set(id,{token,expiresAt:Math.min(expiresAt,now+FACTORY_SESSION_SECONDS*1000)});return id;
}
export function lookupFactorySession(id:string|undefined,now=Date.now()):FactorySession|null{
 if(!id)return null;const session=sessions.get(id);if(!session||session.expiresAt<=now){sessions.delete(id);return null;}return session;
}
export function revokeFactorySession(id:string|undefined){if(id)sessions.delete(id);}
export function factoryCookieOptions(environment:string|undefined=process.env.NODE_ENV){return {httpOnly:true,sameSite:'strict' as const,path:'/',secure:environment==='production',maxAge:FACTORY_SESSION_SECONDS};}
export function factorySameOrigin(request:Request):boolean{
 try{const url=new URL(request.url);if(!['http:','https:'].includes(url.protocol))return false;const host=request.headers.get('host')||url.host;if(!/^(?:[a-zA-Z0-9.-]+|\[[0-9a-fA-F:]+\])(?::\d{1,5})?$/.test(host))return false;return request.headers.get('origin')===new URL(`${url.protocol}//${host}`).origin;}catch{return false;}
}
