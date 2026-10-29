// Geometric yarn paths for visual fabric studies, not scanned/measured material.
export function buildHoodKnitMaps(kind,size=1024,micro=null){
 if(!['terry','rib'].includes(kind))throw new RangeError('Unknown knit');
 const h=new Float32Array(size*size),columns=kind==='rib'?12:24,rows=24,cw=size/columns,ch=size/rows;
 // Rib has continuous raised vertical wales; fine stitches sit on those wales.
 if(kind==='rib')for(let y=0;y<size;y++)for(let x=0;x<size;x++){const ridge=Math.pow(.5+.5*Math.cos(x/cw*Math.PI*2),2);h[y*size+x]=.10+.34*ridge;}
 else for(let y=0;y<size;y++)for(let x=0;x<size;x++)h[y*size+x]=.24+.035*Math.sin(2*Math.PI*(137*x+53*y)/size)*Math.sin(2*Math.PI*(113*y-23*x)/size);
 function yarn(cx,cy,radius,level){const r=Math.ceil(radius),ix=Math.floor(cx),iy=Math.floor(cy);for(let y=iy-r;y<=iy+r;y++)for(let x=ix-r;x<=ix+r;x++){const d=Math.hypot(x-cx,y-cy)/radius;if(d>=1)continue;const at=((y%size+size)%size)*size+(x%size+size)%size;const tube=Math.sqrt(1-d*d)*(1+.055*Math.sin(cx*.9+cy*.6+x*1.8-y*.8));h[at]=Math.max(h[at],level+tube*.24);}}
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  if(kind==='terry'){
   // Rounded elongated loops, slightly irregular and overlapping at their bases.
   const phase=Math.sin(col*13.7+row*7.3),lean=.07*phase;
   for(let j=0;j<100;j++){const t=j/100*Math.PI*2,x=(col+.5+(row%2)*.17+.34*Math.sin(t)+lean*Math.cos(t))*cw,y=(row+.5+.65*Math.cos(t)+.05*phase*Math.sin(t))*ch;const front=.5+.5*Math.sin(t);yarn(x,y,cw*(.15+.025*Math.sin(t*7+phase)),.19+.12*front);}
  }else{
   // Small knit legs along each raised column, separated by the recessed channel.
   for(const side of [-1,1])for(let j=0;j<60;j++){const t=j/59,x=(col+side*(.19-.15*t))*cw,y=(row+t)*ch;yarn(x,y,cw*.045,.32);}
  }
 }
 if(micro){
  const atMicro=(x,y)=>{const sx=(x*3)%micro.width,sy=(y*3)%micro.height,i=(sy*micro.width+sx)*4;return (micro.data[i]+micro.data[i+1]+micro.data[i+2])/765;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=y*size+x,detail=atMicro(x,y);h[k]+=(detail-.65)*.42;}
 }
 const normal=new Uint8ClampedArray(size*size*4),diffuse=new Uint8ClampedArray(size*size*4),roughness=new Uint8ClampedArray(size*size*4);
 const at=(x,y)=>h[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,dx=(at(x+1,y)-at(x-1,y))*4,dy=(at(x,y+1)-at(x,y-1))*4,len=Math.hypot(dx,dy,1);normal.set([(-dx/len*.5+.5)*255,(dy/len*.5+.5)*255,(1/len*.5+.5)*255,255],i);const fiber=2*Math.sin(2*Math.PI*(139*x+47*y)/size)*Math.sin(2*Math.PI*(107*y-31*x)/size),shade=203+at(x,y)*85+fiber;diffuse.set([shade,shade,shade,255],i);roughness.set([242,242,242,255],i);}
 return {normal,diffuse,roughness,width:size,height:size};
}
