import {BufferGeometry, Float32BufferAttribute, Vector3} from 'three';
import type {GarmentPart} from './garment-geometry.ts';
/** Short deterministic fibers rooted on the currently deformed cloth, not a surrounding shell. */
export function createWoolFuzz(parts:GarmentPart[], count=24000):BufferGeometry {
 const faces:{part:GarmentPart;a:number;b:number;c:number;end:number}[]=[];
 const a=new Vector3(),b=new Vector3(),c=new Vector3();let area=0;
 for(const part of parts){const p=part.geometry.getAttribute('position'),index=part.geometry.index!;for(let i=0;i<index.count;i+=3){const ia=index.getX(i),ib=index.getX(i+1),ic=index.getX(i+2);a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib).sub(a);c.fromBufferAttribute(p,ic).sub(a);const size=b.cross(c).length()*.5;if(size>1e-10){area+=size;faces.push({part,a:ia,b:ib,c:ic,end:area});}}}
 const positions:number[]=[],fade:number[]=[];let seed=73013;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 if(faces.length)for(let i=0;i<count;i++){
  const target=random()*area;let lo=0,hi=faces.length-1;while(lo<hi){const mid=(lo+hi)>>>1;if(faces[mid].end<target)lo=mid+1;else hi=mid;}
  const f=faces[lo],p=f.part.geometry.getAttribute('position'),n=f.part.geometry.getAttribute('normal');
  const root=new Vector3(),normal=new Vector3();const u=Math.sqrt(random()),v=random(),weights=[1-u,u*(1-v),u*v];
  [f.a,f.b,f.c].forEach((index,j)=>{root.addScaledVector(a.fromBufferAttribute(p,index),weights[j]);normal.addScaledVector(a.fromBufferAttribute(n,index),weights[j]);});normal.normalize();
  root.addScaledVector(normal,.0007);const tip=root.clone().addScaledVector(normal,.002+random()*.005);
  tip.x+=(random()-.5)*.003;tip.y+=(random()-.5)*.003;
  positions.push(...root.toArray(),...tip.toArray());fade.push(.55,0);
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('fiberFade',new Float32BufferAttribute(fade,1));return geometry;
}
