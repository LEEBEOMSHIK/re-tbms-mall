import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWoolKnitMaps, woolKnitHeight, WOOL_KNIT_TILE_METERS } from '../src/features/garment-designer/wool-knit.ts';

test('stockinette loops repeat continuously over both tile boundaries',()=>{
 for(const [u,v] of [[.123,.267],[0,0],[.91,.86]]){
  assert.ok(Math.abs(woolKnitHeight(u,v)-woolKnitHeight(u+1,v))<1e-8);
  assert.ok(Math.abs(woolKnitHeight(u,v)-woolKnitHeight(u,v+1))<1e-8);
 }
 assert.ok(WOOL_KNIT_TILE_METERS>.09&&WOOL_KNIT_TILE_METERS<.12);
});
test('wool maps retain deep neutral grooves, nonflat normals and opaque matte roughness',()=>{
 const maps=buildWoolKnitMaps(256);
 let low=255,high=0,normalLow=255,normalHigh=0;
 for(let i=0;i<maps.diffuse.length;i+=4){
  assert.equal(maps.diffuse[i],maps.diffuse[i+1]);assert.equal(maps.diffuse[i],maps.diffuse[i+2]);
  low=Math.min(low,maps.diffuse[i]);high=Math.max(high,maps.diffuse[i]);
  normalLow=Math.min(normalLow,maps.normal[i]);normalHigh=Math.max(normalHigh,maps.normal[i]);
  assert.ok(maps.roughness[i]>=220);
  for(const pixels of [maps.normal,maps.roughness,maps.diffuse])assert.equal(pixels[i+3],255);
  const n=[maps.normal[i],maps.normal[i+1],maps.normal[i+2]].map(x=>x/255*2-1);
  assert.ok(Math.abs(Math.hypot(...n)-1)<.015);
 }
 assert.ok(high-low>60);assert.ok(normalHigh-normalLow>50);
 assert.deepEqual(maps.diffuse,buildWoolKnitMaps(256).diffuse);
});
test('wool generator rejects invalid sizes',()=>{for(const n of [0,100,NaN,2049])assert.throws(()=>buildWoolKnitMaps(n),RangeError);});
