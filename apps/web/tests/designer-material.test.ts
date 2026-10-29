import test from 'node:test';
import assert from 'node:assert/strict';
import { MeshPhysicalMaterial, Texture } from 'three';
import { FabricTextureCache, applyFabric, fabricPreset, neutralizeFabricPixels } from '../src/features/garment-designer/fabric-material.ts';

test('cotton and wool use distinct relief sources without tinting printed artwork', () => {
  const cotton = fabricPreset('cotton');
  const wool = fabricPreset('wool');
  assert.notEqual(cotton.source, wool.source);
  const print = new Texture();
  const material = new MeshPhysicalMaterial({ map: print });
  applyFabric(material, wool, .3);
  assert.equal(material.map, print);
  assert.equal(material.color.getHex(), 0xffffff);
  assert.ok(material.sheen > .15 && material.sheen < .6);
  assert.ok(material.normalScale.x > cotton.normalStrength);
  material.dispose(); print.dispose();
});

test('gloss cannot make matte fabric metallic or drive roughness outside valid limits', () => {
  const material = new MeshPhysicalMaterial();
  for (const gloss of [NaN, -10, 0, 1, 100]) {
    applyFabric(material, fabricPreset('wool'), gloss);
    assert.ok(material.roughness >= .35 && material.roughness <= 1);
    assert.equal(material.metalness, 0);
  }
  material.dispose();
});

test('texture cache shares loads and disposes resources arriving after unmount', async () => {
  const pending: ((texture: Texture) => void)[] = [];
  const cache = new FabricTextureCache(() => new Promise(resolve => pending.push(resolve)));
  const first = cache.load('cotton_jersey');
  const second = cache.load('cotton_jersey');
  assert.equal(first, second);
  assert.equal(pending.length, 3);
  cache.dispose();
  let disposed = 0;
  pending.forEach(resolve => {
    const texture = new Texture();
    texture.addEventListener('dispose', () => disposed++);
    resolve(texture);
  });
  await assert.rejects(first, /disposed/);
  assert.equal(disposed, 3);
});

test('partial texture failure disposes successful partner and allows retry', async () => {
  let calls = 0, disposed = 0;
  const cache = new FabricTextureCache(async () => {
    calls++;
    if (calls === 2) throw new Error('missing roughness');
    const texture = new Texture();
    texture.addEventListener('dispose', () => disposed++);
    return texture;
  });
  await assert.rejects(cache.load('wool_boucle'), /missing roughness/);
  assert.equal(disposed, 2);
  await cache.load('wool_boucle');
  assert.equal(calls, 6);
  cache.dispose();
  assert.equal(disposed, 5);
});

test('gloss actually changes reflection roughness while remaining nonmetallic', () => {
  const material = new MeshPhysicalMaterial({ roughness: 0, metalness: 1 });
  applyFabric(material, fabricPreset('cotton'), 0);
  const matte = material.roughness;
  applyFabric(material, fabricPreset('cotton'), 1);
  assert.ok(material.roughness < matte);
  assert.equal(material.metalness, 0);
});

test('fiber luminance removes scan dye color and keeps a neutral midpoint', () => {
  const pixels = new Uint8ClampedArray([180, 160, 120, 255, 220, 200, 160, 255]);
  neutralizeFabricPixels(pixels);
  assert.equal(pixels[0], pixels[1]);
  assert.equal(pixels[1], pixels[2]);
  assert.equal(pixels[4], pixels[5]);
  assert.equal(pixels[5], pixels[6]);
  assert.equal((pixels[0] + pixels[4]) / 2, 128);
  assert.ok(pixels[0] < pixels[4]);
});



test('fiber extraction removes broad dye blocks while retaining small yarn contrast', () => {
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const at = (y * 64 + x) * 4;
    pixels[at] = pixels[at + 1] = pixels[at + 2] = x < 32 ? 80 : 180;
    pixels[at + 3] = 255;
  }
  neutralizeFabricPixels(pixels, 64);
  assert.equal(pixels[(32 * 64 + 16) * 4], 128);
  assert.equal(pixels[(32 * 64 + 48) * 4], 128);
});


test('all four fabric families have dedicated sources and sports knit directional reflection resets when switched', () => {
  const ids = ['cotton', 'wool', 'polyester', 'sweat'];
  assert.equal(new Set(ids.map(id => fabricPreset(id).source)).size, 4);
  const material = new MeshPhysicalMaterial();
  applyFabric(material, fabricPreset('polyester'), 0);
  assert.ok(material.anisotropy > 0);
  const syntheticRoughness = material.roughness;
  applyFabric(material, fabricPreset('sweat'), 0);
  assert.equal(material.anisotropy, 0);
  assert.ok(material.roughness > syntheticRoughness);
  material.dispose();
});


test('procedural knit failure disposes partial canvases and permits clean retry', async () => {
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalDispose = Texture.prototype.dispose;
  let creates = 0, disposed = 0;
  Texture.prototype.dispose = function () { disposed++; originalDispose.call(this); };
  Object.defineProperty(globalThis, 'document', {configurable:true, value:{createElement:()=>({getContext:()=>{
    creates++; if (creates === 2) return null;
    return {createImageData:(width:number,height:number)=>({data:new Uint8ClampedArray(width*height*4)}),putImageData:()=>{}};
  }})}});
  const cache = new FabricTextureCache();
  try {
    await assert.rejects(cache.load('polyester_interlock'), /니트/);
    assert.equal(disposed, 1);
    await cache.load('polyester_interlock');
    cache.dispose();
    assert.equal(disposed, 4);
  } finally {
    cache.dispose(); Texture.prototype.dispose = originalDispose;
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});


test('boucle fiber extraction limits dye checker edge halos without losing fine grain', () => {
  const build = () => {const p=new Uint8ClampedArray(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const a=(y*64+x)*4;const v=(x<32?80:180)+((x+y)%2?7:-7);p[a]=p[a+1]=p[a+2]=v;p[a+3]=255;}return p;};
  const broad=build(),fine=build();neutralizeFabricPixels(broad,64);neutralizeFabricPixels(fine,64,2);
  const halo=(p:Uint8ClampedArray)=>{let total=0;for(let x=22;x<42;x++)total+=Math.abs((p[(30*64+x)*4]+p[(31*64+x)*4])/2-128);return total;};
  assert.ok(halo(fine)<halo(broad)*.4);
  assert.notEqual(fine[(30*64+10)*4],fine[(30*64+11)*4]);
});
