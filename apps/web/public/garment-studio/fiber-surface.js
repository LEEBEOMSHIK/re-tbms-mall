import * as T from 'three';

// Deterministic short, tapered fiber ribbons; lit by the same scene as the cloth.
export function createFiberPile(surfaces,{density=18000,length=.005,width=.00045,color='#e3dfd3',seed=19}={}){
 let s=seed;const rand=()=>((s=(1664525*s+1013904223)>>>0)/4294967296);
 const triangles=[];let total=0;
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3();
 for(const {geometry:g,reverse=false} of surfaces){const p=g.attributes.position,n=g.attributes.normal,idx=g.index;
  for(let k=0;k<idx.count;k+=3){const ids=[idx.getX(k),idx.getX(k+1),idx.getX(k+2)];a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);const area=ab.subVectors(b,a).cross(ac.subVectors(c,a)).length()*.5;if(area<1e-10)continue;total+=area;triangles.push({p,n,ids,reverse,end:total});}}
 const vertices=[],normals=[];
 if(!total)return new T.Group();
 for(let i=0,count=Math.ceil(total*density);i<count;i++){const pick=rand()*total;let lo=0,hi=triangles.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(triangles[mid].end<pick)lo=mid+1;else hi=mid;}const t=triangles[lo];let u=rand(),v=rand();if(u+v>1){u=1-u;v=1-v;}const weights=[u,v,1-u-v],p=new T.Vector3(),n=new T.Vector3();for(let j=0;j<3;j++){p.addScaledVector(a.fromBufferAttribute(t.p,t.ids[j]),weights[j]);n.addScaledVector(a.fromBufferAttribute(t.n,t.ids[j]),weights[j]);}n.normalize().multiplyScalar(t.reverse?-1:1);p.addScaledVector(n,.00015);
 const axis=new T.Vector3(rand()-.5,rand()-.5,rand()-.5).cross(n).normalize();const h=length*(.35+.65*rand()),w=width*(.5+.5*rand());const tip=p.clone().addScaledVector(n,h).addScaledVector(axis,h*.5);const left=p.clone().addScaledVector(axis,-w),right=p.clone().addScaledVector(axis,w);vertices.push(...left.toArray(),...right.toArray(),...tip.toArray());const softNormal=n.clone().addScaledVector(axis,.25).normalize();normals.push(...softNormal.toArray(),...softNormal.toArray(),...softNormal.toArray());}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
 return new T.Mesh(g,new T.MeshStandardMaterial({color,roughness:1,metalness:0,side:T.DoubleSide}));
}

export function buildBrushedMaps(size=512){
 const normal=new Uint8ClampedArray(size*size*4),diffuse=new Uint8ClampedArray(size*size*4),roughness=new Uint8ClampedArray(size*size*4),height=new Float32Array(size*size);
 // Periodic irregular nap, avoiding a repeated loop/stockinette pattern.
 const hash=(x,y)=>{let n=Math.imul(x+71,374761393)^Math.imul(y+137,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 const noise=(u,v,nx,ny)=>{const x=u*nx,y=v*ny,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),at=(a,b)=>hash((a+nx)%nx,(b+ny)%ny);return (at(ix,iy)*(1-sx)+at(ix+1,iy)*sx)*(1-sy)+(at(ix,iy+1)*(1-sx)+at(ix+1,iy+1)*sx)*sy;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size;height[y*size+x]=.25+.45*noise(u,v,128,64)+.20*noise(u,v,64,128)+.10*noise(u,v,32,32);}
 const h=(x,y)=>height[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,dx=(h(x+1,y)-h(x-1,y))*.55,dy=(h(x,y+1)-h(x,y-1))*.55,l=Math.hypot(dx,dy,1),shade=225+25*h(x,y);normal.set([(-dx/l*.5+.5)*255,(dy/l*.5+.5)*255,(1/l*.5+.5)*255,255],i);diffuse.set([shade,shade,shade,255],i);roughness.set([250,250,250,255],i);}
 return {normal,diffuse,roughness,width:size,height:size};
}
