'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createGarmentGeometry, surfacePoint, FABRIC_REFERENCE_SCALE } from './garment-geometry';
import meshData from './garment-mesh-data.json';
import {createWoolFuzz} from './wool-fuzz';
import { flatCamera } from './flat-projection';
import { studioDistance } from './studio-camera';
import { loadImages, paintSurface } from './composite';
import { applyFabric, fabricPreset, FabricTextureCache, neutralizeFabricPixels, type FabricTextures } from './fabric-material';
import { fiberShadowPixels } from './fiber-shading';
import { MATERIALS, type DesignDocument, type SurfaceId } from './model';

interface Runtime {
  ready: () => boolean;
  capture: () => Promise<Blob>;
  update: (doc: DesignDocument, images: Record<string, HTMLImageElement>) => void;
  view: (back: boolean) => void;
  zoom: (factor: number) => void;
  angle: () => void;
  detail: (enabled: boolean) => void;
}

export default function Preview3D({ document: design, assetUrls, presentation = 'studio', surface = 'front', onCaptureReady }: {
  document: DesignDocument;
  assetUrls: Record<string, string>;
  presentation?: 'studio' | 'flat';
  surface?: SurfaceId;
  onCaptureReady?: (capture: (() => Promise<Blob>) | null) => void;
}) {
  const flat = presentation === 'flat';
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [loadedImageKey, setLoadedImageKey] = useState('');
  const [fabricState, setFabricState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [detail, setDetail] = useState(false);
  const detailRef = useRef(false);
  const latest = useRef(design);
  useEffect(() => { latest.current = design; }, [design]);
  const urlKey = JSON.stringify(assetUrls);
  const latestUrlKey = useRef(urlKey);
  useEffect(() => { latestUrlKey.current = urlKey; }, [urlKey]);
  const imageCache = useRef<{ key: string; images: Record<string, HTMLImageElement> }>({ key: '', images: {} });

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: flat });
    } catch {
      queueMicrotask(() => setError('의류 미리보기를 시작하지 못했습니다. 다시 시도하세요.'));
      return;
    }
    let alive = true;
    let lost = false;
    let materialRequest = 0;
    let activeMaterial = '';
    let materialReady = false;
    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('aria-label', flat ? '실제 의류 형태와 원단을 표시하는 2D 편집 미리보기' : '의류 3D 미리보기. 아래 버튼으로 앞뒤 전환과 원단 확대를 할 수 있습니다.');
    container.appendChild(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .87;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.background = flat ? null : new THREE.Color('#e8e5df');
    renderer.setClearColor('#000000', flat ? 0 : 1);
    const camera = flat ? flatCamera(latest.current.template_id, surface) : new THREE.PerspectiveCamera(38, 1, .1, 30);
    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.enabled = !flat;
    controls.minDistance = .2;
    controls.maxDistance = 12;
    controls.minPolarAngle = .25;
    controls.maxPolarAngle = Math.PI - .25;

    const environmentScene = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(environmentScene, .04);
    scene.environment = environment.texture;
    scene.environmentIntensity = .18;
    environmentScene.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x696466, .3));
    const key = new THREE.DirectionalLight(0xfff5e9, 2.6);
    key.position.set(-3, 2.5, 1.7);
    key.shadow.radius = 3;
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: .5, far: 12 });
    key.shadow.bias = -.0005;
    key.shadow.normalBias = .015;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe7efff, .6);
    fill.position.set(3, 1, 3);
    scene.add(fill);

    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.ShadowMaterial({ color: '#50483f', opacity: .18 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.96;
    floor.receiveShadow = true;
    scene.add(floor);

    const canvases = {} as Record<SurfaceId, HTMLCanvasElement>;
    const textures = {} as Record<SurfaceId, THREE.CanvasTexture>;
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    for (const surface of ['front', 'back'] as const) {
      const composite = window.document.createElement('canvas');
      composite.width = composite.height = 1024;
      canvases[surface] = composite;
      textures[surface] = new THREE.CanvasTexture(composite);
      textures[surface].colorSpace = THREE.SRGBColorSpace;
      textures[surface].anisotropy = anisotropy;
    }
    const materials = [
      new THREE.MeshPhysicalMaterial({ map: textures.front, side: THREE.DoubleSide }),
      new THREE.MeshPhysicalMaterial({ map: textures.back, side: THREE.DoubleSide }),
      new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide }),
    ];
    const garment = new THREE.Group();
    let parts = createGarmentGeometry(latest.current.template_id, latest.current.material_id);
    let shapeMaterial = latest.current.material_id;
    for (const part of parts) {
      const material = materials[part.surface === 'front' ? 0 : part.surface === 'back' ? 1 : 2];
      const mesh = new THREE.Mesh(part.geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      garment.add(mesh);
    }
    const fuzzMaterial = new THREE.ShaderMaterial({transparent:true,depthWrite:false,
      uniforms:{fiberColor:{value:new THREE.Color(latest.current.base_color)}},
      vertexShader:'attribute float fiberFade; varying float fade; void main(){fade=fiberFade;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform vec3 fiberColor; varying float fade; void main(){gl_FragColor=vec4(fiberColor,fade*.38); \n #include <tonemapping_fragment> \n #include <colorspace_fragment> \n }'
    });
    let fuzz:THREE.LineSegments|null=null;
    const updateFuzz=()=>{if(fuzz){garment.remove(fuzz);fuzz.geometry.dispose();fuzz=null;}if(shapeMaterial==='wool'){fuzz=new THREE.LineSegments(createWoolFuzz(parts),fuzzMaterial);garment.add(fuzz);}};
    updateFuzz();
    scene.add(garment);
    const bounds = new THREE.Box3().setFromObject(garment);
    const garmentSize = bounds.getSize(new THREE.Vector3());
    const garmentCenter = bounds.getCenter(new THREE.Vector3());
    floor.position.y = bounds.min.y - .035;

    const cache = new FabricTextureCache();
    const bindings = new Map<string, { garment: FabricTextures; tile: HTMLCanvasElement }>();
    const clonedTextures: THREE.Texture[] = [];
    const render = () => { if (alive && !lost) renderer.render(scene, camera); };

    let lastFit = 1;
    const aspect = () => camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1;
    const fitDistance = () => detailRef.current ? studioDistance(.16, .16, .03, aspect()) : studioDistance(garmentSize.x, garmentSize.y, garmentSize.z, aspect());
    const showDetail = (enabled: boolean, back = false) => {
      const facing = (flat ? surface === 'back' : back) ? -1 : 1;
      key.position.set(-3, enabled ? 1 : 2.5, (enabled ? .5 : 1.7) * facing);
      fill.position.set(3, 1, 3 * facing);
      garment.visible = true;
      floor.visible = !flat && !enabled;
      if (flat) { render(); return; }
      controls.target.copy(enabled ? new THREE.Vector3(...surfacePoint('front', .5, .22, latest.current.template_id, latest.current.material_id)) : garmentCenter);
      lastFit = fitDistance();
      camera.position.copy(controls.target).add(new THREE.Vector3(enabled ? 0 : .03, enabled ? 0 : .06, back ? -lastFit : lastFit));
      controls.update();
      render();
    };
    const resize = () => {
      const width = container.clientWidth, height = container.clientHeight;
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height, false);
      if (camera instanceof THREE.PerspectiveCamera) camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (flat) { render(); return; }
      const fitted = fitDistance();
      camera.position.sub(controls.target).multiplyScalar(fitted / lastFit).add(controls.target);
      lastFit = fitted;
      controls.update();
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    controls.addEventListener('change', render);
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      setError('의류 미리보기 연결이 중단되었습니다. 다시 시도하세요.');
    };
    canvas.addEventListener('webglcontextlost', onLost);

    const captureReady = () => alive && !lost && materialReady && activeMaterial === latest.current.material_id && imageCache.current.key === latestUrlKey.current;
    runtime.current = {
      ready: captureReady,
      async capture() {
        if (!captureReady()) throw new Error('원단과 나염을 모두 불러온 뒤 다시 저장하세요.');
        const size = renderer.getSize(new THREE.Vector2());
        const ratio = renderer.getPixelRatio();
        const output = window.document.createElement('canvas');
        output.width = output.height = 2048;
        try {
          renderer.setPixelRatio(1);
          renderer.setSize(2048, 2048, false);
          renderer.render(scene, camera);
          const context = output.getContext('2d');
          if (!context) throw new Error('의류 이미지를 만들지 못했습니다.');
          context.drawImage(canvas, 0, 0);
        } finally {
          renderer.setPixelRatio(ratio);
          renderer.setSize(size.x, size.y, false);
          render();
        }
        return new Promise<Blob>((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error('의류 PNG를 만들지 못했습니다.')), 'image/png'));
      },
      update(doc, images) {
        if (!alive) return;
        if(shapeMaterial!==doc.material_id){
          if(fuzz){garment.remove(fuzz);fuzz.geometry.dispose();fuzz=null;}
          garment.clear();parts.forEach(part=>part.geometry.dispose());
          parts=createGarmentGeometry(doc.template_id,doc.material_id);shapeMaterial=doc.material_id;
          for(const part of parts){const mesh=new THREE.Mesh(part.geometry,materials[part.surface==='front'?0:part.surface==='back'?1:2]);mesh.castShadow=mesh.receiveShadow=true;garment.add(mesh);}
          updateFuzz();
          bounds.setFromObject(garment);
          bounds.getSize(garmentSize);
          bounds.getCenter(garmentCenter);
          floor.position.y=bounds.min.y-.035;
          if(!flat){
            const target=detailRef.current?new THREE.Vector3(...surfacePoint('front',.5,.22,doc.template_id,doc.material_id)):garmentCenter;
            const delta=target.clone().sub(controls.target);
            camera.position.add(delta);controls.target.copy(target);controls.update();
          }
        }
        fuzzMaterial.uniforms.fiberColor.value.set(doc.base_color).multiplyScalar(.82);
        const preset = fabricPreset(doc.material_id);
        for (const material of materials) applyFabric(material, preset, doc.gloss);
        materials[2].color.set(doc.base_color);
        const binding = bindings.get(doc.material_id);
        const paintFiber = (context: CanvasRenderingContext2D, size: number) => {
          if (!binding) return;
          const pattern = context.createPattern(binding.tile, 'repeat');
          if (!pattern) return;
          const repeat = preset.detailScale / preset.tileMeters * FABRIC_REFERENCE_SCALE;
          const projection = meshData[doc.template_id].projection;
          pattern.setTransform(new DOMMatrix().translate(.5 * size, (1 - projection.vOffset) * size).scale(size * projection.xFactor / (binding.tile.width * repeat), size * projection.yFactor / (binding.tile.width * repeat)));
          context.save();
          context.globalCompositeOperation = 'multiply';
          context.globalAlpha = 1;
          context.fillStyle = pattern;
          context.fillRect(0, 0, size, size);
          context.restore();
        };
        for (const surface of ['front', 'back'] as const) {
          paintSurface(canvases[surface].getContext('2d')!, doc, surface, images, 1024, paintFiber);
          textures[surface].needsUpdate = true;
        }
        if (activeMaterial !== doc.material_id) {
          activeMaterial = doc.material_id;
          const request = ++materialRequest;
          materialReady = false;
          setFabricState('loading');
          for (const material of materials) {
            material.normalMap = material.roughnessMap = null;
            material.needsUpdate = true;
          }
          cache.load(preset.source).then(scan => {
            if (!alive || request !== materialRequest) return;
            let binding = bindings.get(doc.material_id);
            if (!binding) {
              const clone = (texture: THREE.Texture, x: number, y: number) => {
                const copy = texture.clone();
                copy.repeat.set(x, y);
                copy.channel = 1;
                copy.anisotropy = anisotropy;
                copy.needsUpdate = true;
                clonedTextures.push(copy);
                return copy;
              };
              // Fabric channel uses a nominal visual scale independently of print UVs.
              const repeat = 1 / preset.tileMeters * preset.detailScale;
              const tile = window.document.createElement('canvas');
              const sourceImage = scan.diffuse.image as HTMLImageElement;
              tile.width = sourceImage.width; tile.height = sourceImage.height;
              const tileContext = tile.getContext('2d')!;
              tileContext.drawImage(sourceImage, 0, 0);
              const pixels = tileContext.getImageData(0, 0, tile.width, tile.height);
              if(preset.source !== 'wool_knit') neutralizeFabricPixels(pixels.data, tile.width, preset.source === 'wool_boucle' ? 2 : 12);
              fiberShadowPixels(pixels.data, preset.fiberOcclusion);
              tileContext.putImageData(pixels, 0, 0);
              binding = {
                tile,
                garment: { normal: clone(scan.normal, repeat, repeat * tile.width / tile.height), roughness: clone(scan.roughness, repeat, repeat * tile.width / tile.height) },
              };
              bindings.set(doc.material_id, binding);
            }
            for (const material of materials) {
              material.normalMap = binding.garment.normal;
              material.roughnessMap = binding.garment.roughness;
              material.needsUpdate = true;
            }
            materialReady = true;
            setFabricState('ready');
            runtime.current?.update(latest.current, imageCache.current.key === latestUrlKey.current ? imageCache.current.images : {});
            render();
          }).catch(() => {
            if (alive && request === materialRequest) setFabricState('fallback');
          });
        }
        render();
      },
      view(back) { detailRef.current = false; setDetail(false); showDetail(false, back); },
      angle() { detailRef.current = false; setDetail(false); showDetail(false); camera.position.copy(controls.target).add(new THREE.Vector3(.48, .1, .88).normalize().multiplyScalar(lastFit * 1.08)); controls.update(); render(); },
      zoom(factor) {
        camera.position.sub(controls.target).multiplyScalar(factor).clampLength(detailRef.current ? .2 : .5, 12).add(controls.target);
        controls.update();
        render();
      },
      detail: showDetail,
    };
    runtime.current.update(latest.current, imageCache.current.key === latestUrlKey.current ? imageCache.current.images : {});
    showDetail(detailRef.current);
    resize();
    return () => {
      alive = false;
      materialRequest++;
      runtime.current = null;
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.dispose();
      canvas.removeEventListener('webglcontextlost', onLost);
      parts.forEach(part => part.geometry.dispose());
      fuzz?.geometry.dispose();fuzzMaterial.dispose();
      [...materials, floorMaterial].forEach(material => material.dispose());
      Object.values(textures).forEach(texture => texture.dispose());
      clonedTextures.forEach(texture => texture.dispose());
      cache.dispose();
      floorGeometry.dispose();
      environment.dispose();
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
    // Image and document changes update the existing scene through runtime.
  }, [attempt, design.template_id, flat, surface]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    loadImages(JSON.parse(urlKey), controller.signal).then(images => {
      if (active) {
        imageCache.current = { key: urlKey, images };
        runtime.current?.update(latest.current, images);
        setLoadedImageKey(urlKey);
      }
    }).catch(e => {
      if (active && e.name !== 'AbortError') setError('3D 나염 이미지를 불러오지 못했습니다. 다시 시도하세요.');
    });
    return () => { active = false; controller.abort(); };
  }, [urlKey, attempt]);
  useEffect(() => {
    runtime.current?.update(design, imageCache.current.key === latestUrlKey.current ? imageCache.current.images : {});
  }, [design, urlKey, attempt]);

  useEffect(() => {
    onCaptureReady?.(!error && loadedImageKey === urlKey && runtime.current?.ready() ? runtime.current.capture : null);
    return () => onCaptureReady?.(null);
  }, [onCaptureReady, error, fabricState, loadedImageKey, urlKey, attempt, flat, surface, design.template_id, design.material_id]);

  const materialName = MATERIALS.find(material => material.id === design.material_id)?.name ?? '원단';
  if (flat) return <section aria-label="2D 의류 확인" style={{ minWidth: 0, position: 'relative' }}><div ref={host} style={{ width: '100%', aspectRatio: '1', overflow: 'hidden' }} />{error && <p role="alert" style={{ position: 'absolute', inset: 'auto 8px 8px', background: 'var(--surface)' }}>{error} <button type="button" onClick={() => { setError(''); setAttempt(n => n + 1); }}>다시 시도</button></p>}{fabricState === 'loading' && <p role="status" style={{ position: 'absolute', inset: 'auto 8px 8px' }}>원단 표면 불러오는 중</p>}{fabricState === 'fallback' && <p role="alert" style={{ position: 'absolute', inset: 'auto 8px 8px' }}>원단을 불러오지 못했습니다. <button type="button" onClick={() => { setError(''); setAttempt(n => n + 1); }}>다시 시도</button></p>}</section>;
  return <section aria-label="3D 의류 확인" style={{ minWidth: 0 }}>
    <div ref={host} style={{ width: '100%', height: 'clamp(300px,48vw,540px)', borderRadius: 12, background: '#e8e5df', overflow: 'hidden' }} />
    {error && <p role="alert">{error}</p>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
      <button type="button" aria-pressed={!detail} onClick={() => { detailRef.current = false; setDetail(false); runtime.current?.detail(false); }}>전체 의류</button>
      <button type="button" aria-pressed={detail} onClick={() => { detailRef.current = true; setDetail(true); runtime.current?.detail(true); }}>원단 확대</button>
      <button type="button" onClick={() => runtime.current?.view(false)}>정면</button>
      <button type="button" onClick={() => runtime.current?.view(true)}>후면</button>
      <button type="button" onClick={() => runtime.current?.angle()}>사선</button>
      <button type="button" onClick={() => runtime.current?.zoom(.8)}>확대</button>
      <button type="button" onClick={() => runtime.current?.zoom(1.25)}>축소</button>
      <button type="button" onClick={() => { setError(''); setAttempt(n => n + 1); }}>3D 다시 시작</button>
    </div>
    <p aria-live="polite" style={{ fontSize: 12, marginTop: 8 }}>
      {materialName} · {detail ? '의류 표면 확대' : '드래그로 회전 · 휠/두 손가락으로 확대'}
      {fabricState === 'loading' && ' · 원단 표면 불러오는 중'}
      {fabricState === 'fallback' && ' · 원단 파일을 불러오지 못해 단색 표면으로 표시합니다. 3D 다시 시작을 눌러 재시도하세요.'}
    </p>
    <p style={{ fontSize: 12, marginTop: 8 }}>{design.template_id === 'hoodie' ? '기본 모델: 여성 슬림 핏 · 내려진 후드' : '기본 모델: 반소매 티셔츠 착용 핏'}. 2D와 3D는 같은 의류 모델과 원단을 사용합니다.</p>
    <p style={{ fontSize: 12, marginTop: 8 }}>면·니트 플리스는 원단 스캔, 울과 폴리에스터는 전용 니트 조직 기반 PBR입니다. 원단별 정적 주름과 두께를 표현합니다. 실제 제작 원단의 물성·발색·처짐은 별도 확인이 필요합니다.</p>
    <details style={{ fontSize: 12, marginTop: 8 }}><summary>모델·원단 출처</summary><p>티셔츠: Margaret Toigo (MRT), CC0. 후드: Elvaerwyn, CC-BY. MakeHuman Community 제공 의류를 편집 좌표에 맞게 변환했습니다. 면·니트 플리스: Poly Haven, CC0. 울: 사용자 참고 사진의 스토키네트 조직을 바탕으로 제작한 재질·짧은 잔털, 실측 스캔 아님. 폴리에스터 인터록: 전용 절차형 니트 조직·방향성 반사, 실측 스캔 아님.</p><a href="https://static.makehumancommunity.org/assets/assetpacks/shirts01.html" target="_blank" rel="noreferrer">티셔츠 출처</a> · <a href="https://static.makehumancommunity.org/assets/assetpacks/shirts02.html" target="_blank" rel="noreferrer">후드 출처</a> · <a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">원단 이용 조건</a></details>
  </section>;
}
