import test from 'node:test';
import assert from 'node:assert/strict';
import { createGarmentGeometry } from '../src/features/garment-designer/garment-geometry.ts';
for(const template of ['tshirt','hoodie'] as const) test(`${template} fabric uses consistent nominal density across torso and seams without changing print UV`,()=>{
 for(const part of createGarmentGeometry(template)){
  const fabric=part.geometry.getAttribute('uv1'),positions=part.geometry.getAttribute('position');
  assert.ok(fabric,'independent fabric UV channel is required');
  for(let i=0;i<positions.count;i++){
   assert.ok(Math.abs(fabric.getX(i)-positions.getX(i)*.4*(part.surface==='back'?-1:1))<1e-6);
   assert.ok(Math.abs(fabric.getY(i)-positions.getY(i)*.4)<1e-6);
  }
  part.geometry.dispose();
 }
});
