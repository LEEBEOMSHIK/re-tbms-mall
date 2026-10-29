import { garmentOutline, type DesignDocument, type SurfaceId } from './model.ts';
export type DesignImages = Record<string,CanvasImageSource>;
export function paintSurface(ctx:CanvasRenderingContext2D,doc:DesignDocument,surface:SurfaceId,images:DesignImages,size:number,paintFabric?: (ctx:CanvasRenderingContext2D,size:number)=>void):void {
 ctx.clearRect(0,0,size,size);ctx.fillStyle=doc.base_color;ctx.fillRect(0,0,size,size);paintFabric?.(ctx,size);
 for(const layer of doc.decorations){const image=images[layer.asset_id];if(!layer.visible||layer.surface_id!==surface||!image||![layer.center.x,layer.center.y,layer.size.width,layer.size.height,layer.rotation_degrees].every(Number.isFinite)||layer.size.width<=0||layer.size.height<=0)continue;ctx.save();ctx.translate(layer.center.x*size,layer.center.y*size);ctx.rotate(layer.rotation_degrees*Math.PI/180);ctx.drawImage(image,-layer.size.width*size/2,-layer.size.height*size/2,layer.size.width*size,layer.size.height*size);ctx.restore();}
}
export function paintDesign(ctx:CanvasRenderingContext2D,doc:DesignDocument,surface:SurfaceId,images:DesignImages,size:number):void {
 ctx.clearRect(0,0,size,size);ctx.save();ctx.beginPath();garmentOutline(doc.template_id).forEach((p,i)=>{if(i===0)ctx.moveTo(p.x*size,p.y*size);else ctx.lineTo(p.x*size,p.y*size);});ctx.closePath();ctx.save();ctx.clip();paintSurface(ctx,doc,surface,images,size);ctx.restore();ctx.strokeStyle='rgba(50,45,40,.35)';ctx.lineWidth=size/500;ctx.stroke();
 if(doc.template_id==='hoodie'){ctx.beginPath();ctx.ellipse(size*.5,size*.14,size*.105,size*.12,0,Math.PI,Math.PI*2);ctx.lineTo(size*.58,size*.19);ctx.quadraticCurveTo(size*.5,size*.24,size*.42,size*.19);ctx.closePath();ctx.fillStyle=doc.base_color;ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(size*.34,size*.65);ctx.lineTo(size*.39,size*.59);ctx.lineTo(size*.61,size*.59);ctx.lineTo(size*.66,size*.65);ctx.lineTo(size*.66,size*.79);ctx.lineTo(size*.34,size*.79);ctx.closePath();if(surface==='front')ctx.stroke();}
 ctx.restore();
}
export async function loadImages(urls:Record<string,string>,signal?:AbortSignal):Promise<Record<string,HTMLImageElement>> {
 const entries=await Promise.all(Object.entries(urls).map(([id,url])=>new Promise<[string,HTMLImageElement]>((resolve,reject)=>{const img=new Image();const clear=()=>{img.onload=null;img.onerror=null;signal?.removeEventListener('abort',abort);};const abort=()=>{clear();img.src='';reject(new DOMException('Aborted','AbortError'));};if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});img.onload=()=>{clear();resolve([id,img]);};img.onerror=()=>{clear();reject(new Error('나염 이미지를 불러오지 못했습니다.'));};img.src=url;})));
 return Object.fromEntries(entries);
}
