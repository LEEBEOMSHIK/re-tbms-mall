import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from '../../public/garment-studio/vendor/three.module.js';
const source=(await readFile(new URL('../../public/garment-studio/fiber-surface.js',import.meta.url),'utf8')).replace("from 'three'",`from '${new URL('../../public/garment-studio/vendor/three.module.js',import.meta.url).href}'`);
const {createFiberPile,buildBrushedMaps}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const g=new T.PlaneGeometry(1,1),small=new T.PlaneGeometry(.5,.5);
const front=createFiberPile([{geometry:g}],{density:100,length:.004});
const back=createFiberPile([{geometry:g,reverse:true}],{density:100,length:.004});
const patch=createFiberPile([{geometry:small}],{density:100,length:.004});
assert.equal(front.geometry.attributes.position.count,300);
assert.equal(patch.geometry.attributes.position.count,75);
for(let i=0;i<300;i++){assert(front.geometry.attributes.position.getZ(i)>0);assert(back.geometry.attributes.position.getZ(i)<0);assert(front.geometry.attributes.normal.getZ(i)>.9);}
const again=createFiberPile([{geometry:g}],{density:100,length:.004});assert.deepEqual(again.geometry.attributes.position.array,front.geometry.attributes.position.array);
const maps=buildBrushedMaps(128);assert.equal(maps.normal.length,128*128*4);assert(new Set(maps.diffuse).size>5);assert(maps.roughness[0]>240);
for(const mesh of [front,back,patch,again]){mesh.geometry.dispose();mesh.material.dispose();}g.dispose();small.dispose();
console.log('PASS fiber area density, inward orientation, stable generation and brushed map variation');
