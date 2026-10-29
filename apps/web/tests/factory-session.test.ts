import test from 'node:test';
import assert from 'node:assert/strict';
import {createFactorySession,lookupFactorySession,revokeFactorySession,factorySameOrigin,factoryCookieOptions,FACTORY_SESSION_COOKIE,FACTORY_SESSION_SECONDS} from '../src/lib/factory-session-core.ts';
import {createSession,lookupSession,revokeSession,SESSION_COOKIE} from '../src/lib/admin-session-core.ts';
test('factory and internal admin sessions have separate identifiers and stores',()=>{
 const now=1000;const factory=createFactorySession('synthetic-factory-token',now+60000,now),admin=createSession('synthetic-admin-token',now);
 assert.notEqual(FACTORY_SESSION_COOKIE,SESSION_COOKIE);assert.equal(lookupSession(factory,now),null);assert.equal(lookupFactorySession(admin,now),null);
 assert.equal(lookupFactorySession(factory,now)?.token,'synthetic-factory-token');
 revokeFactorySession(factory);assert.equal(lookupFactorySession(factory,now),null);assert.notEqual(lookupSession(admin,now),null);revokeSession(admin);
});
test('factory expiry honors upstream expiry and caps local lifetime',()=>{
 const now=1000;assert.throws(()=>createFactorySession('token',now,now));assert.throws(()=>createFactorySession('',now+1000,now));
 const short=createFactorySession('token',now+1000,now);assert.notEqual(lookupFactorySession(short,now+999),null);assert.equal(lookupFactorySession(short,now+1000),null);
 const long=createFactorySession('token',now+FACTORY_SESSION_SECONDS*2000,now);assert.equal(lookupFactorySession(long,now)?.expiresAt,now+FACTORY_SESSION_SECONDS*1000);revokeFactorySession(long);
});
test('factory mutations require exact origin and do not trust forwarded host',()=>{
 const request=(headers:Record<string,string>)=>new Request('http://localhost:3100/api/factory/session',{headers});
 assert.equal(factorySameOrigin(request({host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100'})),true);
 assert.equal(factorySameOrigin(request({host:'127.0.0.1:3100',origin:'https://attacker.example','x-forwarded-host':'attacker.example'})),false);
 assert.equal(factorySameOrigin(request({host:'127.0.0.1:3100'})),false);
 assert.equal(factoryCookieOptions('production').httpOnly,true);assert.equal(factoryCookieOptions('production').secure,true);assert.equal(factoryCookieOptions('development').secure,false);assert.equal(factoryCookieOptions().sameSite,'strict');
});
