import { CanvasTexture, MeshPhysicalMaterial, RepeatWrapping, Texture, TextureLoader } from 'three';
import {buildSportsKnitMaps} from './sports-knit.ts';
import {buildWoolKnitMaps, WOOL_KNIT_TILE_METERS} from './wool-knit.ts';

export type FabricSource = 'cotton_jersey' | 'wool_boucle' | 'knitted_fleece' | 'polyester_interlock' | 'wool_knit';
export interface FabricPreset {
  source: FabricSource;
  roughness: number;
  normalStrength: number;
  sheen: number;
  sheenRoughness: number;
  tileMeters: number;
  detailScale: number;
  fiberOcclusion: number;
  anisotropy: number;
  specularIntensity: number;
}
const PRESETS: Record<string, FabricPreset> = {
  cotton: { source: 'cotton_jersey', roughness: .96, normalStrength: .6, sheen: .18, sheenRoughness: .9, tileMeters: .264, detailScale: 1, fiberOcclusion: .3, anisotropy: 0, specularIntensity: .25 },
  wool: { source: 'wool_knit', roughness: 1, normalStrength: .85, sheen: .38, sheenRoughness: .95, tileMeters: WOOL_KNIT_TILE_METERS, detailScale: 1, fiberOcclusion: .9, anisotropy: 0, specularIntensity: .16 },
  polyester: { source: 'polyester_interlock', roughness: .48, normalStrength: .45, sheen: .28, sheenRoughness: .35, tileMeters: .048, detailScale: 1, fiberOcclusion: .18, anisotropy: .45, specularIntensity: .6 },
  sweat: { source: 'knitted_fleece', roughness: .99, normalStrength: .85, sheen: .55, sheenRoughness: .95, tileMeters: .2664, detailScale: 1, fiberOcclusion: .6, anisotropy: 0, specularIntensity: .22 },
};
export function fabricPreset(id: string): FabricPreset {
  return PRESETS[id] ?? PRESETS.cotton;
}

export function applyFabric(material: MeshPhysicalMaterial, preset: FabricPreset, gloss: number) {
  const boundedGloss = Number.isFinite(gloss) ? Math.max(0, Math.min(1, gloss)) : .15;
  material.roughness = Math.max(.35, preset.roughness - boundedGloss * .3);
  material.metalness = 0;
  material.normalScale.setScalar(preset.normalStrength);
  material.sheen = preset.sheen;
  material.sheenColor.set('#ffffff');
  material.sheenRoughness = preset.sheenRoughness;
  material.specularIntensity = preset.specularIntensity + boundedGloss * .2;
  material.anisotropy = preset.anisotropy;
  material.anisotropyRotation = Math.PI / 2;
  // The composite map already includes the chosen base color and original artwork.
  // No scanned diffuse is multiplied over it, so colored yarn cannot tint the print.
}

export interface FabricTextures { normal: Texture; roughness: Texture }
export interface FabricScan extends FabricTextures { diffuse: Texture }
export class FabricTextureCache {
  private pending = new Map<FabricSource, Promise<FabricScan>>();
  private owned = new Set<Texture>();
  private disposed = false;
  private loader: (url: string) => Promise<Texture>;

  constructor(loader?: (url: string) => Promise<Texture>) {
    this.loader = loader ?? (url => new TextureLoader().loadAsync(url));
  }

  load(source: FabricSource): Promise<FabricScan> {
    if (this.disposed) return Promise.reject(new Error('Texture cache disposed'));
    const existing = this.pending.get(source);
    if (existing) return existing;
    if (source === 'polyester_interlock' || source === 'wool_knit') {
      const created: Texture[] = [];
      const make = (pixels: Uint8ClampedArray, width: number, height: number) => {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('니트 원단을 생성하지 못했습니다.');
        const image = context.createImageData(width, height); image.data.set(pixels); context.putImageData(image, 0, 0);
        const texture = new CanvasTexture(canvas); texture.wrapS = texture.wrapT = RepeatWrapping;
        this.owned.add(texture); created.push(texture); return texture;
      };
      // Keep creation failures on the same asynchronous failure path as downloaded scans.
      const generated = Promise.resolve().then(() => {
        if (this.disposed) throw new Error('Texture cache disposed');
        const maps = source === 'wool_knit' ? buildWoolKnitMaps() : buildSportsKnitMaps();
        return { normal: make(maps.normal, maps.width, maps.height), roughness: make(maps.roughness, maps.width, maps.height), diffuse: make(maps.diffuse, maps.width, maps.height) };
      }).catch(error => { created.forEach(texture => { texture.dispose(); this.owned.delete(texture); }); this.pending.delete(source); throw error; });
      this.pending.set(source, generated); return generated;
    }
    const request = Promise.allSettled([
      this.loader(`/garment-materials/${source}_nor_gl_1k.jpg`),
      this.loader(`/garment-materials/${source}_rough_1k.jpg`),
      this.loader(`/garment-materials/${source}_diff_1k.jpg`),
    ]).then(results => {
      const failed = results.find(result => result.status === 'rejected');
      if (this.disposed || failed) {
        for (const result of results) if (result.status === 'fulfilled') result.value.dispose();
        throw this.disposed ? new Error('Texture cache disposed') : (failed as PromiseRejectedResult).reason;
      }
      const textures = results.map(result => (result as PromiseFulfilledResult<Texture>).value);
      for (const texture of textures) {
        texture.wrapS = texture.wrapT = RepeatWrapping;
        this.owned.add(texture);
      }
      return { normal: textures[0], roughness: textures[1], diffuse: textures[2] };
    }).catch(error => {
      this.pending.delete(source);
      throw error;
    });
    this.pending.set(source, request);
    return request;
  }

  dispose() {
    this.disposed = true;
    this.owned.forEach(texture => texture.dispose());
    this.owned.clear();
    this.pending.clear();
  }
}
/** Extract yarn-scale luminance, removing the scan's dye and broad plaid blocks. */
export function neutralizeFabricPixels(pixels: Uint8ClampedArray, width = pixels.length / 4, radius = 12) {
  if (!pixels.length) return;
  const height = pixels.length / 4 / width;
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  const luminances = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      const index = y * width + x, at = index * 4;
      const luminance = pixels[at] * .2126 + pixels[at + 1] * .7152 + pixels[at + 2] * .0722;
      luminances[index] = luminance;
      row += luminance;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  // A 25px local mean removes large colored yarn blocks at 1K. Restrained
  // contrast keeps the selected solid color dominant, including at block edges.
  // Small neighborhoods on dyed boucle retain fiber grain without broad checker-edge halos.
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const left = Math.max(0, x - radius), right = Math.min(width, x + radius + 1);
    const top = Math.max(0, y - radius), bottom = Math.min(height, y + radius + 1);
    const sum = integral[bottom * stride + right] - integral[top * stride + right]
      - integral[bottom * stride + left] + integral[top * stride + left];
    const mean = sum / ((right - left) * (bottom - top));
    const index = y * width + x, at = index * 4;
    const neutral = Math.max(104, Math.min(152, 128 + (luminances[index] - mean) * .8));
    pixels[at] = pixels[at + 1] = pixels[at + 2] = neutral;
    pixels[at + 3] = 255;
  }
}
