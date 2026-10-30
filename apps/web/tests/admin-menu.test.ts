import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_ADMIN_MENU,MENU_ITEMS,moveMenuItem,parseAdminMenu,visibleMenuCount} from '../src/lib/admin-menu.ts';
const fresh=()=>structuredClone(DEFAULT_ADMIN_MENU);
test('defaults cover fixed routes once and visibility respects group and item independently',()=>{
  const state=parseAdminMenu(fresh());assert.equal(state.groups.length,4);assert.equal(visibleMenuCount(state.groups),9);
  state.groups[0].visible=false;assert.equal(visibleMenuCount(state.groups),6);assert.equal(state.groups[0].items.every(i=>i.visible),true);
  state.groups.forEach(g=>g.visible=false);assert.equal(visibleMenuCount(state.groups),0);
  assert.equal(MENU_ITEMS.some(i=>String(i.href)==='/admin/navigation'),false);
});
test('strict DTO rejects unsafe revisions extra fields external routes and invalid group values',()=>{
  for(const revision of [-1,1.1,Number.MAX_SAFE_INTEGER,Infinity,'1',true])assert.throws(()=>parseAdminMenu({...fresh(),revision}));
  assert.throws(()=>parseAdminMenu({...fresh(),extra:true}));
  for(const update of [{id:' x '},{id:'../bad'},{label:'  '},{label:'x'.repeat(41)},{visible:'false'},{href:'https://example.com'}]){
    const s=fresh();Object.assign(s.groups[0],update);assert.throws(()=>parseAdminMenu(s));
  }
  const s=fresh();s.groups[0].label='  운영  ';assert.equal(parseAdminMenu(s).groups[0].label,'운영');
});
test('all registered menus must appear exactly once even when hidden or regrouped',()=>{
  const missing=fresh();missing.groups[0].items.pop();assert.throws(()=>parseAdminMenu(missing));
  const duplicate=fresh();duplicate.groups[1].items[0]={...duplicate.groups[0].items[0]};assert.throws(()=>parseAdminMenu(duplicate));
  const groupDuplicate=fresh();groupDuplicate.groups[1].id=groupDuplicate.groups[0].id;assert.throws(()=>parseAdminMenu(groupDuplicate));
  const injected=fresh();Object.assign(injected.groups[0].items[0],{id:'navigation'});assert.throws(()=>parseAdminMenu(injected));
  const extra=fresh();Object.assign(extra.groups[0].items[0],{url:'/admin'});assert.throws(()=>parseAdminMenu(extra));
  assert.throws(()=>parseAdminMenu({...fresh(),groups:[]}));
});
test('moving menu preserves visibility and identities without mutating source; empty group can remain',()=>{
  const s=fresh();s.groups[0].items[0].visible=false;
  const moved=moveMenuItem(s.groups,'home','project');
  assert.equal(s.groups[0].items[0].id,'home');assert.equal(moved[0].items.some(i=>i.id==='home'),false);
  assert.deepEqual(moved[3].items.at(-1),{id:'home',visible:false});assert.equal(parseAdminMenu({...s,groups:moved}).groups.length,4);
  assert.equal(moveMenuItem(s.groups,'home','missing'),s.groups);
  const empty=moveMenuItem(s.groups,'workboard','operations');assert.equal(empty[3].items.length,1);assert.doesNotThrow(()=>parseAdminMenu({...s,groups:empty}));
});
