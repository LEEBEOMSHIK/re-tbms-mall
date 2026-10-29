import test from 'node:test';
import assert from 'node:assert/strict';
import { fiberShadowPixels } from '../src/features/garment-designer/fiber-shading.ts';
test('source yarn shadows remain visible on white cloth without dye or invented marks',()=>{
 const pixels=new Uint8ClampedArray([104,104,104,255,128,128,128,255,152,152,152,255]);
 fiberShadowPixels(pixels,1);
 assert.deepEqual([...pixels],[207,207,207,255,255,255,255,255,255,255,255,255]);
});
test('fiber response is bounded and zero strength leaves cloth unchanged',()=>{
 for(const strength of [0,-1,NaN]) {const pixels=new Uint8ClampedArray([104,104,104,255]);fiberShadowPixels(pixels,strength);assert.deepEqual([...pixels],[255,255,255,255]);}
 const pixels=new Uint8ClampedArray([0,0,0,255]);fiberShadowPixels(pixels,100);assert.deepEqual([...pixels],[191,191,191,255]);
});
