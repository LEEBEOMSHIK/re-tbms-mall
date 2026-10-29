import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import {createWoolFuzz} from '../src/features/garment-designer/wool-fuzz.ts';
test('wool fibers root on cloth and remain short and deterministic',()=>{
 const cloth=new BufferGeometry();cloth.setAttribute('position',new Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));cloth.setAttribute('normal',new Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));cloth.setIndex([0,1,2]);
 const parts=[{name:'front',geometry:cloth}];const first=createWoolFuzz(parts,50),second=createWoolFuzz(parts,50);const p=first.getAttribute('position');assert.equal(p.count,100);assert.deepEqual(p.array,second.getAttribute('position').array);
 for(let i=0;i<p.count;i+=2){assert.ok(p.getX(i)>=0&&p.getY(i)>=0&&p.getX(i)+p.getY(i)<=1.00001);assert.ok(p.getZ(i+1)>p.getZ(i));assert.ok(p.getZ(i+1)<.009);}
 first.dispose();second.dispose();cloth.dispose();
});
