import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, lookupSession, revokeSession, SESSION_SECONDS, sameOrigin, testLoginAllowed, sessionCookieOptions, validateAdminToken } from '../src/lib/admin-session-core.ts';
test('opaque sessions expire and are revoked on logout', () => {
  const id = createSession('synthetic-key',1000);
  assert.match(id,/^[a-f0-9]{64}$/); assert.notEqual(id,'synthetic-key');
  assert.equal(lookupSession(id,1001)?.token,'synthetic-key');
  assert.equal(lookupSession(id,1000+SESSION_SECONDS*1000),null);
  const second = createSession('synthetic-key',2000); revokeSession(second); assert.equal(lookupSession(second,2001),null);
  assert.equal(lookupSession('made-up',1),null);
});
test('same-origin checks reject absent or foreign origins and test login is dev-loopback only', () => {
  const local = new Request('http://127.0.0.1:3100/api/admin/session',{headers:{Origin:'http://127.0.0.1:3100'}});
  assert(sameOrigin(local)); assert(testLoginAllowed(local,'development'));
  for (const env of ['production','test',undefined]) assert.equal(testLoginAllowed(local,env),false);
  for (const origin of ['http://evil.test','null','http://127.0.0.1:3101']) assert.equal(sameOrigin(new Request(local.url,{headers:{Origin:origin}})),false);
  assert.equal(sameOrigin(new Request(local.url)),false);
  assert.equal(testLoginAllowed(new Request('http://mall.test/api/admin/session',{headers:{Origin:'http://mall.test'}}),'development'),false);
});
test('cookies are httpOnly strict and secure in production', () => {
  assert.deepEqual(sessionCookieOptions('production'),{httpOnly:true,sameSite:'strict',path:'/',secure:true,maxAge:28800});
  assert.equal(sessionCookieOptions('development').secure,false);
});
test('uses actual Host when Next normalizes URL, without accepting forwarded hosts or foreign origins', () => {
  const request = (headers: Record<string,string>) => new Request('http://localhost:3100/api/admin/session', { headers });
  const valid = request({host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100'});
  assert(sameOrigin(valid)); assert(testLoginAllowed(valid,'development'));
  assert.equal(testLoginAllowed(valid,'production'),false);
  assert.equal(sameOrigin(request({host:'127.0.0.1:3100',origin:'http://localhost:3100'})),false);
  assert.equal(sameOrigin(request({host:'127.0.0.1:3100',origin:'http://evil.test','x-forwarded-host':'evil.test'})),false);
  assert.equal(sameOrigin(request({host:'127.0.0.1:3100',origin:'https://127.0.0.1:3100','x-forwarded-proto':'https'})),false);
  assert.equal(testLoginAllowed(request({host:'mall.test:3100',origin:'http://mall.test:3100'}),'development'),false);
  for (const host of ['evil.test/path','user@127.0.0.1:3100','127.0.0.1:3100,evil.test','127.0.0.1:99999'])
    assert.equal(sameOrigin(request({host,origin:'http://127.0.0.1:3100'})),false);
});
test('upstream token validation does not accept failed authentication or outages', async () => {
  assert.equal(await validateAdminToken('synthetic','http://127.0.0.1:8100',async(url,options)=>{assert.match(String(url),/admin\/storefront$/);assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer synthetic');return Response.json({});}),200);
  for(const status of [401,500,503]) assert.equal(await validateAdminToken('synthetic','http://api',async()=>new Response('private diagnostic',{status})),status===401?401:503);
  assert.equal(await validateAdminToken('synthetic','http://api',async()=>{throw Error('private diagnostic');}),503);
});
