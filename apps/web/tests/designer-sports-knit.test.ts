import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSportsKnitMaps, sportsKnitHeight } from '../src/features/garment-designer/sports-knit.ts';

test('sports knit is periodic at texture edges and retains directional loops',()=>{
 for(const [x,y] of [[.13,.27],[.8,.93],[0,0],[-.3,2.8]]){
  assert.ok(Math.abs(sportsKnitHeight(x,y)-sportsKnitHeight(x+1,y))<1e-9);
  assert.ok(Math.abs(sportsKnitHeight(x,y)-sportsKnitHeight(x,y+1))<1e-9);
 }
 assert.notEqual(sportsKnitHeight(.5,.2),sportsKnitHeight(.1,.2));
});
test('dedicated knit maps are deterministic, opaque, neutral and have normalized relief',()=>{
 const a=buildSportsKnitMaps(512), b=buildSportsKnitMaps(512);
 assert.deepEqual(a.normal,b.normal);
 assert.equal(a.width,512); assert.equal(a.height,512);
 const shades=new Set<number>(), normals=new Set<number>();
 for(let i=0;i<a.diffuse.length;i+=4){
  assert.equal(a.diffuse[i],a.diffuse[i+1]);assert.equal(a.diffuse[i+1],a.diffuse[i+2]);
  for(const data of [a.diffuse,a.normal,a.roughness])assert.equal(data[i+3],255);
  const nx=a.normal[i]/255*2-1,ny=a.normal[i+1]/255*2-1,nz=a.normal[i+2]/255*2-1;
  assert.ok(Math.abs(Math.hypot(nx,ny,nz)-1)<.015);
  shades.add(a.diffuse[i]);normals.add(a.normal[i]);
 }
 assert.ok(shades.size>4); assert.ok(normals.size>10);
});
test('invalid sports knit sizes fail before allocation',()=>{
 for(const size of [0,3,127,NaN,Infinity,4096])assert.throws(()=>buildSportsKnitMaps(size),RangeError);
});
