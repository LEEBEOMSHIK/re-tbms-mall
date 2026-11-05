import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAdminNavigation} from '../src/lib/load-admin-navigation.ts';
import {DEFAULT_ADMIN_MENU} from '../src/lib/admin-menu.ts';

test('sidebar recovers from one transient failure and uses the saved presentation',async()=>{
  const config=structuredClone(DEFAULT_ADMIN_MENU);
  config.groups[0].visible=false;
  let count=0;
  const loaded=await loadAdminNavigation(new AbortController().signal,async()=>++count===1?new Response(null,{status:503}):Response.json(config));
  assert.equal(count,2);
  assert.deepEqual(loaded,config);
});
test('unauthorized and corrupt responses do not silently replace menu settings',async()=>{
  for(const response of [new Response(null,{status:401}),Response.json({groups:[]})]){
    let count=0;
    await assert.rejects(()=>loadAdminNavigation(new AbortController().signal,async()=>{count++;return response;}));
    assert.equal(count,1);
  }
});
