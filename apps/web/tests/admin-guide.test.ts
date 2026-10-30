import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ADMIN_GUIDES } from '../src/lib/admin-guide.ts';
import { MENU_ITEMS } from '../src/lib/admin-menu.ts';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const app=path.join(root,'apps/web/src/app/admin/(protected)');
const nonempty=(value:string,label:string)=>assert.ok(typeof value==='string'&&value.trim().length>0,label);

test('guide entries have unique stable anchors and complete workflow instructions',()=>{
  assert.ok(ADMIN_GUIDES.length>0);
  const ids=new Set<string>();
  for(const guide of ADMIN_GUIDES){
    assert.match(guide.id,/^[a-z][a-z0-9-]*$/);assert.ok(!ids.has(guide.id),`duplicate anchor ${guide.id}`);ids.add(guide.id);
    for(const field of ['title','summary','completion'] as const)nonempty(guide[field],`${guide.id}.${field}`);
    assert.match(guide.updatedAt,/^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(guide.updatedAt+'T00:00:00Z').toISOString().slice(0,10),guide.updatedAt);
    assert.ok(guide.prerequisites.length>0&&guide.steps.length>0&&guide.notes.length>0);
    for(const text of [...guide.prerequisites,...guide.notes])nonempty(text,guide.id);
    for(const step of guide.steps){nonempty(step.title,guide.id);nonempty(step.description,guide.id);assert.equal(Boolean(step.href),Boolean(step.linkLabel),`paired link fields ${guide.id}`);}
  }
});

test('every help link targets an existing fixed protected administrator page',()=>{
  for(const guide of ADMIN_GUIDES)for(const step of guide.steps){
    if(!step.href)continue;
    assert.match(step.href,/^\/admin(?:\/[a-z0-9-]+)*$/);
    const relative=step.href.slice('/admin'.length).replace(/^\//,'');
    assert.ok(existsSync(path.join(app,relative,'page.tsx')),`${guide.id}: missing route ${step.href}`);
    nonempty(step.linkLabel!,guide.id);
  }
});

test('maintenance references exist and all configurable menu entries have guidance',()=>{
  const links=new Set(ADMIN_GUIDES.flatMap(g=>g.steps.flatMap(step=>step.href?[step.href]:[])));
  for(const item of MENU_ITEMS)assert.ok(links.has(item.href),`guide missing for menu ${item.id}`);
  for(const guide of ADMIN_GUIDES){
    assert.ok(guide.relatedPaths.length>0,`missing maintenance reference ${guide.id}`);
    for(const related of guide.relatedPaths){
      assert.ok(!path.isAbsolute(related)&&!related.split('/').includes('..'));
      assert.ok(existsSync(path.join(root,related)),`${guide.id}: missing source ${related}`);
    }
  }
});
