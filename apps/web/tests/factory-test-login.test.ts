import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadFactoryTestCredentials} from '../src/lib/factory-test-login.ts';
const req=(host='127.0.0.1:3100',origin='http://127.0.0.1:3100')=>new Request('http://localhost:3100/api/factory/session',{headers:{host,origin}});
test('factory demo credentials require development, loopback, same origin, dedicated local file',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'tbms-factory-test-'));
 try{
  assert.equal(await loadFactoryTestCredentials(req(),'development',root),null);
  await mkdir(path.join(root,'.local'));const file=path.join(root,'.local/factory-test-login.json');
  await writeFile(file,JSON.stringify({username:'factory.demo.0123456789abcdef0123456789abcdef',password:'synthetic-password-for-unit-test'}));
  assert.equal((await loadFactoryTestCredentials(req(),'development',root))?.username,'factory.demo.0123456789abcdef0123456789abcdef');
  for(const environment of ['production','test'])assert.equal(await loadFactoryTestCredentials(req(),environment,root),null);
  assert.equal(await loadFactoryTestCredentials(req('example.com','http://example.com'),'development',root),null);
  assert.equal(await loadFactoryTestCredentials(req('127.0.0.1:3100','https://other.example'),'development',root),null);
  await writeFile(file,JSON.stringify({username:'real.factory',password:'synthetic-password-for-unit-test'}));assert.equal(await loadFactoryTestCredentials(req(),'development',root),null);
  await writeFile(file,'invalid');assert.equal(await loadFactoryTestCredentials(req(),'development',root),null);
 }finally{await rm(root,{recursive:true,force:true})}
});
