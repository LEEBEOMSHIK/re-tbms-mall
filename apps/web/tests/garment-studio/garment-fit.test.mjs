import assert from 'node:assert/strict';
import {fitPoint,FITS,SIZES} from '../../public/garment-studio/garment-fit.js';
import {snapshot,validate} from '../../public/garment-studio/persistence.js';
for(const fit of FITS)for(const size of SIZES){const a=fitPoint(.4,-.25,.2,fit,size),b=fitPoint(-.4,-.25,.2,fit,size);assert(a.every(Number.isFinite));assert.equal(a[0],-b[0]);assert.equal(a[1],b[1]);}
const widths=SIZES.map(size=>fitPoint(.4,0,.2,'unisex',size)[0]);assert(widths.every((x,i)=>!i||x>widths[i-1]));
assert.deepEqual(fitPoint(.4,.2,.2),[.4,.19999999999999996,.2]);
assert(fitPoint(.4,-.25,.2,'male')[0]>.4);assert(fitPoint(.4,-.25,.2,'unisex')[0]>fitPoint(.4,-.25,.2,'male')[0]);
assert.throws(()=>fitPoint(0,0,0,'invalid'));
const state={garment:'hoodie',hoodFabric:'brushed',garmentFit:'male',garmentSize:'XL',fabric:'cotton',color:'#ffffff',background:'#858b90',wrinkles:false,ruler:false,light:'studio',auto:false,designs:[],activeId:null,editSide:'front'};
const r=snapshot(state);assert.equal(validate(r).settings.garmentSize,'XL');assert.equal(r.settings.garmentFit,'male');assert.throws(()=>validate({...r,settings:{...r.settings,garmentSize:'XXL'}}));delete r.settings.garmentFit;delete r.settings.garmentSize;assert.doesNotThrow(()=>validate(r));
console.log('PASS fit symmetry, size ordering, baseline, invalid settings and legacy compatibility');

// Regression: front and rear body depth must not retain the female bust/hip bulges.
import {readFile} from 'node:fs/promises';
for(const name of ['hoodie','hoodie-smooth']){
 const mesh=JSON.parse(await readFile(new URL(`../../public/garment-studio/assets/${name}.json`,import.meta.url),'utf8'));
 for(const fit of ['male','unisex']){const front=[],back=[];
  for(const y of [-.8,-.6,-.4,-.2,0,.15]){const pts=[];for(let i=0;i<mesh.positions.length;i+=3){const [x,py,z]=mesh.positions.slice(i,i+3);if(Math.abs(x)<.35&&Math.abs(py-y)<.025)pts.push(fitPoint(x,py,z,fit,'M','hoodie')[2]);}front.push(Math.max(...pts));back.push(Math.min(...pts));}
  assert(Math.max(...front)-Math.min(...front)<.055,`${name} ${fit}: bust protrusion`);
  assert(Math.max(...back)-Math.min(...back)<.065,`${name} ${fit}: hip/back curve`);
 }
}
console.log('PASS actual hoodie front/rear depth profiles, smooth and wrinkled');
