import type {MaterialId, TemplateId} from './model.ts';

export interface ClothShape { positions: number[]; normals: number[] }
interface ShapeProfile { depth: number; width: number; fold: number; hem: number }
const PROFILES: Record<MaterialId, ShapeProfile> = {
 cotton: {depth:.985,width:1,fold:.011,hem:.008},
 wool: {depth:1.065,width:2.05,fold:.014,hem:.010},
 polyester: {depth:.995,width:1.15,fold:.010,hem:.008},
 sweat: {depth:1.035,width:1.65,fold:.017,hem:.012},
};
const gaussian = (distance:number,width:number) => Math.exp(-.5*(distance/width)**2);
// A local ridge and its shallow adjacent troughs, rather than repeating waves.
function ridge(distance:number,width:number) {
 const q=distance/width;
 return (1-q*q)*Math.exp(-.5*q*q);
}

/** Static visual drape, not a cloth simulation or measured physical thickness.
 * Only Z changes, preserving the persisted document's XY print projection.
 * The map is strictly increasing in Z: depth >= .985 and the bounded fold
 * derivative is >= -.026/.14, so separated layers cannot reverse depth order.
 */
export function clothDepth(template:TemplateId,material:MaterialId,x:number,y:number,z:number):number {
 const profile=PROFILES[material],w=profile.width;
 // Short unequal diagonal folds end in a quiet chest instead of continuing
 // as parallel vertical columns. Each fall has its own centre and direction.
 const localFold=(cx:number,cy:number,tx:number,ty:number,width:number,length:number)=>{
  const dx=x-cx,dy=y-cy;
  const along=dx*tx+dy*ty,across=dx*ty-dy*tx;
  return ridge(across+.18*along*along,width*w)*gaussian(along,length);
 };
 let fold=profile.fold*(
  localFold(-.265,-.49,.42,.9075,.045,.19)
  +.72*localFold(.275,-.56,-.62,.7846,.055,.16)
 );
 // A small oblique gather near the hem is deliberately not mirrored.
 if(material==='cotton'||material==='polyester') {
  fold+=profile.fold*.34*localFold(-.055,-.685,.91,.4146,.026,.115);
 }
 const armY=template==='hoodie'?.10:.32;
 const armPath=.43+.31*(y-armY);
 fold+=profile.fold*.48*gaussian(y-armY,.125*w)*ridge(Math.abs(x)-armPath,.036*w);
 fold+=profile.hem*(
  .70*localFold(-.34,-.66,.78,.6258,.034,.105)
  +.48*localFold(.31,-.71,-.87,.4931,.045,.09)
 );
 // At upper chest/neck all authored seams and hood folds remain dominant.
 const bounded=.026*Math.tanh(fold/.026);
 return z*profile.depth+Math.tanh(z/.14)*bounded;
}

/** Recompute normals across the complete sewn topology before renderer parts
 * split it into print materials; shared boundary vertices therefore match. */
export function shapeCloth(template:TemplateId,material:MaterialId,source:readonly number[],sourceNormals:readonly number[],groups:Readonly<Record<string,readonly number[]>>):ClothShape {
 const positions=Array.from(source),normals=new Array<number>(source.length).fill(0);
 for(let i=0;i<positions.length;i+=3)positions[i+2]=clothDepth(template,material,positions[i],positions[i+1],positions[i+2]);
 for(const indices of Object.values(groups))for(let i=0;i<indices.length;i+=3){
  const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
  const abx=positions[b]-positions[a],aby=positions[b+1]-positions[a+1],abz=positions[b+2]-positions[a+2];
  const acx=positions[c]-positions[a],acy=positions[c+1]-positions[a+1],acz=positions[c+2]-positions[a+2];
  const nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;
  for(const offset of [a,b,c]){normals[offset]+=nx;normals[offset+1]+=ny;normals[offset+2]+=nz;}
 }
 for(let i=0;i<normals.length;i+=3){
  const length=Math.hypot(normals[i],normals[i+1],normals[i+2]);
  for(let k=0;k<3;k++)normals[i+k]=length>1e-12?normals[i+k]/length:sourceNormals[i+k];
 }
 return {positions,normals};
}

