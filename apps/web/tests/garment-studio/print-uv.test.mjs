import assert from 'node:assert/strict';
import {hoodiePrintU as u} from '../../public/garment-studio/print-uv.js';
for(const side of ['front','back']){
 const sign=side==='front'?1:-1;
 assert.equal(u(0,sign*.4,side),.5);
 assert.equal(u(sign*.5,0,side),1);
 assert.equal(u(-sign*.5,0,side),0);
 let prev=-Infinity;
 for(let i=0;i<=100;i++){const t=-Math.PI/2+i*Math.PI/100;const v=u(sign*.5*Math.sin(t),sign*.4*Math.cos(t),side);assert(v>=prev);prev=v;}
}
// Original right-hand graphic at 73%, 22% size, 21 degrees rotation
// fits the torso chart in full, unlike the old ~80% right boundary.
const w=.22,h=w*.9,a=21*Math.PI/180;
assert(.73+(w*Math.cos(a)+h*Math.sin(a))/2<1);
console.log('PASS continuous front/back half-cylinder charts and reported print extent');

import {readFile} from 'node:fs/promises';
// Cover the whole reported rotated print rectangle with actual torso triangles.
for(const file of ['hoodie','hoodie-smooth']){
 const m=JSON.parse(await readFile(new URL(`../../public/garment-studio/assets/${file}.json`,import.meta.url)));
 for(const side of ['front','back']){
  const ids=m.indices[side],tris=[];
  for(let k=0;k<ids.length;k+=3)tris.push(ids.slice(k,k+3).map(i=>[u(m.positions[3*i],m.positions[3*i+2],side),1-(m.projection.vOffset+m.restXY[2*i+1]*m.projection.yFactor)]));
  const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
  const contains=(t,p)=>{const d=t.map((v,i)=>cross(v,t[(i+1)%3],p));return d.every(x=>x>=-1e-8)||d.every(x=>x<=1e-8);};
  for(const center of [.27,.73])for(let ix=0;ix<=8;ix++)for(let iy=0;iy<=8;iy++){
   const x=(ix/8-.5)*w,y=(iy/8-.5)*h,p=[center+x*Math.cos(a)-y*Math.sin(a),.71+x*Math.sin(a)+y*Math.cos(a)];
   assert(tris.some(t=>contains(t,p)),`${file} ${side} print uncovered at ${p}`);
  }
 }
}
console.log('PASS actual torso coverage of left/right rotated print, front/back, both shapes');
