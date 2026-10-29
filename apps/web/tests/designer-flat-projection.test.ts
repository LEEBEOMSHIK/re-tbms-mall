import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import meshData from '../src/features/garment-designer/garment-mesh-data.json' with { type: 'json' };
import { flatCamera, flatFrame, documentToFlat, flatToDocument } from '../src/features/garment-designer/flat-projection.ts';
for (const template of ['tshirt','hoodie'] as const) {
 test(`${template}: entire authored garment fits square frame without distorted proportions`, () => {
  const camera=flatCamera(template,'front');
  assert.ok(Math.abs((camera.right-camera.left)-(camera.top-camera.bottom))<1e-9);
  const positions=meshData[template].positions;
  for(let i=0;i<positions.length;i+=3){const p=new Vector3(...positions.slice(i,i+3) as [number,number,number]).project(camera);assert.ok(Math.abs(p.x)<1 && Math.abs(p.y)<1);}
 });
 for(const surface of ['front','back'] as const) test(`${template} ${surface}: document overlay follows projected cloth and pointer round trips`,()=>{
  const camera=flatCamera(template,surface), p=meshData[template].projection;
  for(const point of [{x:.3,y:.25},{x:.7,y:.75}]){
   const world=new Vector3((point.x-.5)/p.xFactor*(surface==='front'?1:-1),(1-point.y-p.vOffset)/p.yFactor,0).project(camera);
   const overlay=documentToFlat(template,point);
   assert.ok(Math.abs((world.x+1)/2-overlay.x)<1e-9);assert.ok(Math.abs((1-world.y)/2-overlay.y)<1e-9);
   const restored=flatToDocument(template,overlay);assert.ok(Math.abs(restored.x-point.x)<1e-9 && Math.abs(restored.y-point.y)<1e-9);
  }
  const frame=flatFrame(template);assert.ok(frame.width>1 && frame.height>0);
 });
}
