import { OrthographicCamera } from 'three';
import meshData from './garment-mesh-data.json' with { type: 'json' };
import type { TemplateId, SurfaceId } from './model.ts';

type FlatFrame = Readonly<{ left: number; top: number; width: number; height: number }>;
const frames = new Map<TemplateId, FlatFrame>();

/** Square world frame, centered on document coordinates, with room for authored sleeves/hood. */
export function flatFrame(template: TemplateId): FlatFrame {
 const cached = frames.get(template);
 if (cached) return cached;
 const {positions,projection:p}=meshData[template];
 const centerY=(.5-p.vOffset)/p.yFactor;
 let half=.5/Math.min(p.xFactor,p.yFactor);
 for(let i=0;i<positions.length;i+=3)half=Math.max(half,Math.abs(positions[i]),Math.abs(positions[i+1]-centerY));
 half*=1.06;
 const width=half*2*p.xFactor,height=half*2*p.yFactor;
 const frame = Object.freeze({left:(1-width)/2,top:(1-height)/2,width,height});
 frames.set(template, frame);
 return frame;
}
export function documentToFlat(template:TemplateId,point:{x:number;y:number}) {
 const f=flatFrame(template);return {x:(point.x-f.left)/f.width,y:(point.y-f.top)/f.height};
}
export function flatToDocument(template:TemplateId,point:{x:number;y:number}) {
 const f=flatFrame(template);return {x:f.left+point.x*f.width,y:f.top+point.y*f.height};
}
export function flatCamera(template:TemplateId,surface:SurfaceId) {
 const f=flatFrame(template),p=meshData[template].projection;
 const camera=new OrthographicCamera((f.left-.5)/p.xFactor,(f.left+f.width-.5)/p.xFactor,(1-f.top-p.vOffset)/p.yFactor,(1-f.top-f.height-p.vOffset)/p.yFactor,.1,30);
 camera.position.set(0,0,surface==='front'?5:-5);camera.lookAt(0,0,0);camera.updateMatrixWorld();return camera;
}
