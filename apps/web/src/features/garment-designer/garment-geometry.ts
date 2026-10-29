import { BufferGeometry, Float32BufferAttribute } from 'three';
import meshData from './garment-mesh-data.json' with { type: 'json' };
import type { TemplateId, SurfaceId, MaterialId } from './model.ts';
import { shapeCloth, type ClothShape } from './cloth-shape.ts';
const shapeCache = new Map<string, ClothShape>();
function cloth(template:TemplateId,material?:MaterialId):ClothShape {
 const data=meshData[template];
 if(!material)return data;
 const key=template+':'+material;
 if(!shapeCache.has(key))shapeCache.set(key,shapeCloth(template,material,data.positions,data.normals,data.indices));
 return shapeCache.get(key)!;
}

// Authored meshes are normalized display units, not measured manufacturing geometry.
// This nominal scale gives a consistent visual fabric density across all mesh parts.
export const FABRIC_REFERENCE_SCALE = .4;

export interface GarmentPart { name: string; surface?: SurfaceId; geometry: BufferGeometry }

/** Artist meshes retain their proportions; document print coordinates map into
 * the actual torso below each garment's neckline. See scripts/garment-assets. */
export function garmentUV(template: TemplateId, surface: SurfaceId, x: number, y: number): [number, number] {
 const projection = meshData[template].projection;
 return [.5 + (surface === 'front' ? x : -x) * projection.xFactor, projection.vOffset + y * projection.yFactor];
}

/** Intersect the projected document coordinate with the authored cloth surface.
 * The default template preserves existing callers; back view mirrors observer X.
 * Only points on actual cloth are valid; neckline/cuff voids are never filled. */
export function surfacePoint(surface: SurfaceId, u: number, v: number, template: TemplateId = 'tshirt', material?:MaterialId): [number, number, number] {
 const data = meshData[template], projection = data.projection;
 const x = (u - .5) / projection.xFactor * (surface === 'front' ? 1 : -1);
 const y = (1 - v - projection.vOffset) / projection.yFactor;
 let z: number | undefined;
 const p = cloth(template,material).positions;
 for (const indices of Object.values(data.indices)) for (let i = 0; i < indices.length; i += 3) {
  const a = indices[i]*3, b = indices[i+1]*3, c = indices[i+2]*3;
  const denominator = (p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);
  if (Math.abs(denominator) < 1e-12) continue;
  const wa = ((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/denominator;
  const wb = ((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/denominator;
  const wc = 1-wa-wb;
  if (Math.min(wa,wb,wc) < -1e-8) continue;
  const depth = wa*p[a+2]+wb*p[b+2]+wc*p[c+2];
  if (z === undefined || (surface === 'front' ? depth > z : depth < z)) z = depth;
 }
 if (z === undefined) throw new RangeError('Projected point does not intersect garment cloth');
 return [x,y,z];
}

export function createGarmentGeometry(template: TemplateId, material?:MaterialId): GarmentPart[] {
 const data = meshData[template], shape = cloth(template,material);
 return Object.entries(data.indices).map(([name, indices]) => {
  const surface: SurfaceId | undefined = name === 'front' || name === 'back' ? name : undefined;
  const positions: number[] = [], normals: number[] = [], uv: number[] = [], fabricUv: number[] = [], localIndices: number[] = [];
  const remap = new Map<number,number>();
  for (const source of indices) {
   if (!remap.has(source)) {
    remap.set(source,remap.size);
    const offset = source*3, x = data.positions[offset], y = data.positions[offset+1];
    positions.push(x,y,shape.positions[offset+2]);
    normals.push(...shape.normals.slice(offset,offset+3));
    // Neutral sleeve/edge areas use bounded coordinates for fabric sampling.
    const mapped = garmentUV(template,surface ?? 'front',x,y);
    uv.push(...(surface ? mapped : [.5+x*.25,.5+y*.30]));
    fabricUv.push((surface === 'back' ? -x : x) * FABRIC_REFERENCE_SCALE, y * FABRIC_REFERENCE_SCALE);
   }
   localIndices.push(remap.get(source)!);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
  geometry.setAttribute('uv1',new Float32BufferAttribute(fabricUv,2));
  geometry.setIndex(localIndices);
  return {name,surface,geometry};
 });
}
