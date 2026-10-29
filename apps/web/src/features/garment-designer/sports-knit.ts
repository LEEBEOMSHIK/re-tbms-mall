/** Dedicated sports interlock appearance model. This is authored procedural PBR,
 * not a scan or measurement of a manufacturer's polyester sample. Repeated yarn
 * loops approximate the smooth, dense face of an interlock sports jersey. */
export const SPORTS_KNIT_TILE_METERS = .048;
const STITCHES = 32;
const TAU = Math.PI * 2;
const fraction = (value:number) => value-Math.floor(value);
const wrap = (value:number) => value-Math.round(value);

/** Periodic height field with converging legs and rounded loop heads.
 * The second offset bed suggests the intermeshing stitch structure, while the
 * narrow ribs model smooth continuous-filament yarn rather than wool fuzz. */
export function sportsKnitHeight(u:number,v:number):number {
 const x=fraction(u*STITCHES), y=fraction(v*STITCHES);
 const loop=(px:number,py:number) => {
  const phase=fraction(py), dx=Math.abs(wrap(px-.5));
  // Rounded V: close legs at the bottom; a curved head returns to the next row.
  const radius=.07+.29*Math.pow((1+Math.cos(TAU*phase))*.5,.65);
  const distance=dx-radius;
  const yarn=Math.exp(-distance*distance/(2*.046*.046));
  const head=Math.exp(-((phase-.5)**2)/.014)*Math.exp(-(dx*dx)/.035);
  const filament=.96+.04*Math.cos(TAU*(dx*17+phase*3));
  return Math.max(yarn,head*.72)*filament;
 };
 return Math.max(loop(x,y),loop(x+.5,y+.5)*.64);
}

export interface SportsKnitMaps {
 width:number; height:number;
 normal:Uint8ClampedArray; roughness:Uint8ClampedArray; diffuse:Uint8ClampedArray;
}
export function buildSportsKnitMaps(size=512):SportsKnitMaps {
 if(!Number.isInteger(size)||size<128||size>2048||size%STITCHES!==0)throw new RangeError('Sports knit size must be a multiple of32 between128 and2048');
 const normal=new Uint8ClampedArray(size*size*4), roughness=new Uint8ClampedArray(size*size*4), diffuse=new Uint8ClampedArray(size*size*4);
 // One repeat cell is sampled once. Reuse prevents platform/random differences.
 const cell=size/STITCHES, heights=new Float64Array(cell*cell);
 for(let y=0;y<cell;y++)for(let x=0;x<cell;x++)heights[y*cell+x]=sportsKnitHeight(x/size,y/size);
 const height=(x:number,y:number)=>heights[((y+cell)%cell)*cell+(x+cell)%cell];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const cx=x%cell,cy=y%cell,h=height(cx,cy),at=(y*size+x)*4;
  // Derivatives use a fixed fraction of yarn pitch, independent of output size.
  const nx=-(height(cx+1,cy)-height(cx-1,cy))*cell*.10;
  const ny=(height(cx,cy+1)-height(cx,cy-1))*cell*.10;
  const length=Math.hypot(nx,ny,1);
  normal[at]=(nx/length*.5+.5)*255;normal[at+1]=(ny/length*.5+.5)*255;normal[at+2]=(1/length*.5+.5)*255;
  const shade=220+28*h,rough=155-24*h;
  for(let channel=0;channel<3;channel++){diffuse[at+channel]=shade;roughness[at+channel]=rough;}
  normal[at+3]=roughness[at+3]=diffuse[at+3]=255;
 }
 return {width:size,height:size,normal,roughness,diffuse};
}
