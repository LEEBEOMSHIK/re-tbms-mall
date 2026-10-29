import test from 'node:test';
import assert from 'node:assert/strict';
import {createGarmentGeometry, surfacePoint} from '../src/features/garment-designer/garment-geometry.ts';

for(const template of ['tshirt','hoodie'] as const)test(`${template} cotton and wool change cloth depth while preserving print projection and topology`,()=>{
 const cotton=createGarmentGeometry(template,'cotton'),wool=createGarmentGeometry(template,'wool');
 let changed=0,normalChanged=0,cottonDepth=0,woolDepth=0;
 for(let part=0;part<cotton.length;part++){
  const a=cotton[part].geometry,b=wool[part].geometry;
  assert.deepEqual(a.index!.array,b.index!.array);
  assert.deepEqual(a.getAttribute('uv').array,b.getAttribute('uv').array);
  assert.deepEqual(a.getAttribute('uv1').array,b.getAttribute('uv1').array);
  const pa=a.getAttribute('position'),pb=b.getAttribute('position'),na=a.getAttribute('normal'),nb=b.getAttribute('normal');
  for(let i=0;i<pa.count;i++){
   assert.equal(pa.getX(i),pb.getX(i));assert.equal(pa.getY(i),pb.getY(i));
   assert.ok(Math.abs(pa.getZ(i)-pb.getZ(i))<.08,'material shape stays a restrained cloth adjustment');
   if(Math.abs(pa.getZ(i)-pb.getZ(i))>.003)changed++;
   if(Math.abs(na.getZ(i)-nb.getZ(i))>.01)normalChanged++;
   cottonDepth+=Math.abs(pa.getZ(i));woolDepth+=Math.abs(pb.getZ(i));
   assert.ok(Math.abs(Math.hypot(nb.getX(i),nb.getY(i),nb.getZ(i))-1)<1e-5);
  }
 }
 assert.ok(changed>500,'material selection must alter actual cloth shape');
 assert.ok(normalChanged>100,'lighting normals must follow material folds');
 assert.ok(woolDepth>cottonDepth,'wool has a fuller, thicker static profile');
 [...cotton,...wool].forEach(p=>p.geometry.dispose());
});

test('material-aware surface placement tracks changed cloth depth without moving document coordinates',()=>{
 const cotton=surfacePoint('front',.57,.65,'tshirt','cotton');
 const wool=surfacePoint('front',.57,.65,'tshirt','wool');
 assert.equal(cotton[0],wool[0]);assert.equal(cotton[1],wool[1]);
 assert.ok(Math.abs(cotton[2]-wool[2])>.003);
});

test('material deformation preserves depth ordering through inner and outer cloth layers',async()=>{
 const {clothDepth}=await import('../src/features/garment-designer/cloth-shape.ts');
 for(const template of ['tshirt','hoodie'] as const)for(const material of ['cotton','wool','polyester','sweat'] as const){
  for(const x of [-.6,-.3,0,.3,.6])for(const y of [-.8,-.6,-.2,.2,.6]){
   let previous=-Infinity;
   for(let step=0;step<=80;step++){
    const depth=clothDepth(template,material,x,y,-.6+step*.015);
    assert.ok(depth>previous,'separated layers must not cross after shaping');previous=depth;
   }
  }
 }
});

test('wool folds are broader than cotton rather than a stronger copy of its fine wrinkles',async()=>{
 const {clothDepth}=await import('../src/features/garment-designer/cloth-shape.ts');
 const curvature=(material:'cotton'|'wool')=>{
  const values=Array.from({length:181},(_,i)=>clothDepth('tshirt',material,-.45+i*.005,-.35,.24));
  return values.slice(1,-1).reduce((sum,v,i)=>sum+Math.abs(values[i]-2*v+values[i+2]),0);
 };
 assert.ok(curvature('cotton')>curvature('wool')*1.5,'fine cotton folds should bend more sharply than soft wool folds');
});

test('material partition seams share identical recomputed normals',()=>{
 const parts=createGarmentGeometry('hoodie','wool');
 const visited=new Map<string,number[]>();let matches=0;
 for(const {geometry} of parts){
  const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
  for(let i=0;i<p.count;i++){
   const key=[p.getX(i),p.getY(i),p.getZ(i)].join(':');
   const normal=[n.getX(i),n.getY(i),n.getZ(i)],previous=visited.get(key);
   if(previous){assert.deepEqual(normal,previous);matches++;}else visited.set(key,normal);
  }
 }
 assert.ok(matches>20,'test must cover shared front/back/neutral boundaries');
 parts.forEach(p=>p.geometry.dispose());
});

test('cotton gathers taper away before the central chest instead of forming long bars',async()=>{
 const {clothDepth}=await import('../src/features/garment-designer/cloth-shape.ts');
 const span=(y:number)=>{const depths=Array.from({length:81},(_,i)=>clothDepth('tshirt','cotton',-.35+i*.7/80,y,.24));return Math.max(...depths)-Math.min(...depths);};
 assert.ok(span(-.55)>span(-.10)*1.6,'lower gathers must fade before the central chest');
});
