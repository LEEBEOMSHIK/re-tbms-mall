import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
for(const name of ['hoodie','hoodie-smooth']){
 const m=JSON.parse(await readFile(new URL(`../../public/garment-studio/assets/${name}.json`,import.meta.url)));
 const p=m.positions,counts={left:0,right:0};
 for(const [group,ids] of Object.entries(m.indices))for(let k=0;k<ids.length;k+=3){
  const v=ids.slice(k,k+3),c=[0,1,2].map(a=>v.reduce((n,i)=>n+p[3*i+a],0)/3);
  if(Math.abs(c[0])>.15&&Math.abs(c[0])<.5&&c[1]>-.65&&c[1]<-.3&&c[2]>.15){
   assert.equal(group,'front',`${name}: visible lower torso must not lose print to ${group}`);
   counts[c[0]<0?'left':'right']++;
  }
  for(const i of v){assert(Number.isFinite(p[i*3]));assert(Math.abs(m.restXY[i*2]-p[i*3])<.00000051);assert(Math.abs(m.restXY[i*2+1]-p[i*3+1])<.00000051);}
 }
 assert(counts.left>100&&counts.right>100);
 assert(m.indices.lining.length>0&&m.indices.outer.length>0&&m.indices.rib.length>0);
 console.log('PASS continuous left/right torso print charts:',name,counts);
}
