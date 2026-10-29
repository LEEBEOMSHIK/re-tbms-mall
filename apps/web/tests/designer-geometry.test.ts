import test from 'node:test';
import assert from 'node:assert/strict';
import { createGarmentGeometry, garmentUV, surfacePoint } from '../src/features/garment-designer/garment-geometry.ts';
import { PRINT_AREAS } from '../src/features/garment-designer/model.ts';

test('front and back preserve observer left-to-right UV direction',()=>{
 assert.ok(surfacePoint('front',.3,.5)[0]<surfacePoint('front',.7,.5)[0]);
 assert.ok(surfacePoint('back',.3,.5)[0]>surfacePoint('back',.7,.5)[0]);
});
for(const template of ['tshirt','hoodie'] as const){
 test(`${template} artist cloth has finite smooth geometry and bounded texture coordinates`,()=>{
  const parts=createGarmentGeometry(template);
  assert.ok(parts.some(p=>p.surface==='front'));assert.ok(parts.some(p=>p.surface==='back'));
  for(const {geometry} of parts){
   const p=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
   assert.equal(p.count,normal.count);assert.equal(p.count,uv.count);assert.ok(geometry.index);
   assert.ok(Array.from(p.array).every(Number.isFinite));
   assert.ok(Array.from(uv.array).every(v=>Number.isFinite(v)&&v>=-1e-6&&v<=1+1e-6));
   for(let i=0;i<normal.count;i++)assert.ok(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-5);
   geometry.dispose();
  }
 });
 test(`${template} whole printable area lands on actual cloth on both surfaces`,()=>{
  const area=PRINT_AREAS[template];
  for(const surface of ['front','back'] as const)for(const u of [0,.25,.5,.75,1])for(const v of [0,.5,1]){
   const docU=area.x+area.width*u,docV=area.y+area.height*v;
   const point=surfacePoint(surface,docU,docV,template);
   assert.ok(point.every(Number.isFinite));
   assert.ok(surface==='front'?point[2]>0:point[2]<0,'front/back projection must select the correct cloth hemisphere');
   const uv=garmentUV(template,surface,point[0],point[1]);
   assert.ok(Math.abs(uv[0]-docU)<1e-8);assert.ok(Math.abs(uv[1]-(1-docV))<1e-8);
  }
 });
 test(`${template} rendered print UVs use the same torso adapter as placement`,()=>{
  const parts=createGarmentGeometry(template);
  for(const part of parts.filter(p=>p.surface)){
   const p=part.geometry.getAttribute('position'),uv=part.geometry.getAttribute('uv');
   for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/40))){
    const expected=garmentUV(template,part.surface!,p.getX(i),p.getY(i));
    assert.ok(Math.abs(uv.getX(i)-expected[0])<1e-6);assert.ok(Math.abs(uv.getY(i)-expected[1])<1e-6);
   }
  }
  parts.forEach(p=>p.geometry.dispose());
 });
}

test('tee sewn mesh has only four open boundary loops: neck, hem and two cuffs', () => {
 const parts=createGarmentGeometry('tshirt');
 const welded=new Map<string,number>(), edges=new Map<string,number>();
 const pointId=(x:number,y:number,z:number)=>{const key=[x,y,z].map(v=>v.toFixed(5)).join(',');if(!welded.has(key))welded.set(key,welded.size);return welded.get(key)!;};
 for(const {geometry} of parts){
  const position=geometry.getAttribute('position'),index=geometry.index!;
  for(let k=0;k<index.count;k+=3){
   const ids=[0,1,2].map(offset=>{const i=index.getX(k+offset);return pointId(position.getX(i),position.getY(i),position.getZ(i));});
   for(let j=0;j<3;j++){const key=[ids[j],ids[(j+1)%3]].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)??0)+1);}
  }
 }
 const adjacent=new Map<number,Set<number>>();
 for(const [key,count] of edges)if(count===1){const [a,b]=key.split(':').map(Number);for(const [v,w] of [[a,b],[b,a]]){if(!adjacent.has(v))adjacent.set(v,new Set());adjacent.get(v)!.add(w);}}
 const seen=new Set<number>();let loops=0;
 for(const vertex of adjacent.keys())if(!seen.has(vertex)){loops++;const todo=[vertex];seen.add(vertex);while(todo.length){for(const next of adjacent.get(todo.pop()!)??[])if(!seen.has(next)){seen.add(next);todo.push(next);}}}
 assert.equal(loops,4);
 assert.ok([...adjacent.values()].every(neighbors=>neighbors.size===2),'open boundaries form clean loops');
 parts.forEach(p=>p.geometry.dispose());
});
