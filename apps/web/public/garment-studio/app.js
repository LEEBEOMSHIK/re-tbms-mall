import {createContextRecovery} from './context-recovery.js';
import {atlasCopies,offset} from './wrap-print.js';
import {hoodiePrintU} from './print-uv.js';
import {buildHoodKnitMaps} from './hood-knit.js';
import {fitPoint} from './garment-fit.js';
import {createPersistence} from './admin-bridge.js';
import {createDesignState} from './design-state.js';
import {createPrintEditor} from './print-editor.js';
import {createReferenceRuler} from './view-aids.js';
import * as T from 'three';
import {OrbitControls} from './vendor/controls/OrbitControls.js';
import {RoomEnvironment} from './vendor/environments/RoomEnvironment.js';
import {RectAreaLightUniformsLib} from './vendor/lights/RectAreaLightUniformsLib.js';
import {buildWoolKnitMaps} from './wool-knit.js';
import {createFiberPile,buildBrushedMaps} from './fiber-surface.js';
import {buildSportsKnitMaps} from './sports-knit.js';
const $=id=>document.getElementById(id), canvas=$('view');
const presets={cotton:{title:'면 저지',source:'cotton_jersey',shape:'cotton',repeat:.95,normal:.75,rough:.91,sheen:.32,note:'면 저지 스캔 · Blender에서 계산한 가벼운 원단의 주름'},wool:{title:'울 저지 · 티셔츠',shape:'cotton',repeat:3.2,normal:.38,rough:.94,sheen:.5,note:'고운 울 저지와 짧은 잔털 · 형태는 얇은 면 모델 공유'},polyester:{title:'운동복 폴리에스터 니트',shape:'cotton',repeat:3.0,normal:.45,rough:.44,sheen:.18,note:'전용 인터록 조직 · 형태는 면의 계산 결과 공유'},sweat:{title:'스웨트 · 니트 플리스',source:'knitted_fleece',shape:'wool',repeat:.95,normal:.85,rough:.96,sheen:.42,note:'니트 플리스 스캔 · 형태는 울의 계산 결과 공유'}};
const hoodPreset={source:"jogging_melange",resolution:"2k",repeat:.85,normal:.7,rough:.94,sheen:.4};
const designStore=createDesignState({garment:'tshirt',hoodFabric:'terry',garmentFit:'unisex',garmentSize:'M',fabric:'cotton',color:'#e3dfd3',auto:false,light:'studio',wrinkles:false,background:'#858b90',ruler:false});
const state=designStore.state;
const owned=[];let renderer,controls,scene,camera,group,shadow,area,fill,rim,environment,fuzz,currentShape,rulerGuide,loaded=false,printEditor,persistence;
const maps={},shapes={},composites={},materials={};
let wrapCanvas,wrapTexture;
let ribMaterial,liningMaterial,liningBackMaterial,outerMaterial;
let recovery;
const status=text=>recovery?recovery.status(text):$('status').textContent=text;
function rebuildEnvironment(){
 const envScene=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);
 const next=pmrem.fromScene(envScene,.1);environment?.dispose();environment=next;scene.environment=next.texture;
 envScene.dispose();pmrem.dispose();
}
function texturePixels(pixels,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const data=x.createImageData(w,h);data.data.set(pixels);x.putImageData(data,0,0);const t=new T.CanvasTexture(c);owned.push(t);return t;}
function imageCanvas(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);return c;}
function neutralTile(texture,generated,id){
 const c=imageCanvas(texture.image),x=c.getContext('2d'),image=x.getImageData(0,0,c.width,c.height),p=image.data;
 // Preserve yarn-scale variation while removing broad scan dye. No print pixels are processed.
 let blur;
 if(!generated){const b=document.createElement('canvas');b.width=c.width;b.height=c.height;const bx=b.getContext('2d');bx.filter='blur(12px)';bx.drawImage(c,0,0);blur=bx.getImageData(0,0,c.width,c.height).data;}
 for(let i=0;i<p.length;i+=4){const l=(p[i]+p[i+1]+p[i+2])/3;const value=id==='hoodOuter'?Math.max(165,Math.min(255,210+(l-160)*.6)):generated?(id==='wool'?Math.min(255,225+(l-76)*.38):Math.min(255,224+(l-220)*1.1)):242+Math.max(-64,Math.min(13,(l-(blur[i]+blur[i+1]+blur[i+2])/3)*1.2));p[i]=p[i+1]=p[i+2]=value;p[i+3]=255;}
 x.putImageData(image,0,0);return c;
}
async function loadFabric(id){const p=id==='hoodOuter'?hoodPreset:presets[id];let normal,rough,diff;
 if(p.source){const loader=new T.TextureLoader();const results=await Promise.allSettled(['nor_gl','rough','diff'].map(n=>loader.loadAsync(`assets/${p.source}_${n}_${p.resolution||'1k'}.jpg`)));if(results.some(r=>r.status==='rejected')){results.forEach(r=>{if(r.status==='fulfilled')r.value.dispose();});throw Error('원단 스캔을 불러오지 못했습니다. 새로고침해 주세요.');}[normal,rough,diff]=results.map(r=>r.value);owned.push(normal,rough,diff);}
 else{const m=id==='wool'?buildWoolKnitMaps(1024):buildSportsKnitMaps(512);normal=texturePixels(m.normal,m.width,m.height);rough=texturePixels(m.roughness,m.width,m.height);diff=texturePixels(m.diffuse,m.width,m.height);}
 for(const t of [normal,rough]){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(p.repeat,p.repeat);t.channel=1;t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());}
 const tile=neutralTile(diff,!p.source,id),grain=new T.CanvasTexture(tile);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.anisotropy=16;owned.push(grain);maps[id]={normal,rough,grain,sourceDiffuse:diff};
}
const fitGeometryCache=new WeakMap();
function geometry(data,side,inside=false){const g=new T.BufferGeometry(),uv=[],fabric=[];for(let i=0;i<data.positions.length;i+=3){const x=data.restXY[i/3*2],y=data.restXY[i/3*2+1];const printU=state.garment==='hoodie'&&(side==='front'||side==='back')?hoodiePrintU(x,data.positions[i+2],side):.5+(side==='front'?x:-x)*data.projection.xFactor;uv.push(state.garment==='hoodie'&&(side==='front'||side==='back')?(printU+offset(side))/2:printU,data.projection.vOffset+y*data.projection.yFactor);const tileUV=inside&&data.liningUV?data.liningUV:data.fabricUV;fabric.push(tileUV[i/3*2],tileUV[i/3*2+1]);}
 const fitKey=state.garment+':'+state.garmentFit+':'+state.garmentSize;let cachedFit=fitGeometryCache.get(data);if(cachedFit?.key!==fitKey){const positions=[],normals=[],eps=.0001,dx=new T.Vector3(),dy=new T.Vector3(),dz=new T.Vector3(),basis=new T.Matrix4(),nm=new T.Matrix3(),n=new T.Vector3();
 for(let i=0;i<data.positions.length;i+=3){const [x,y,z]=data.positions.slice(i,i+3),f=(a,b,c)=>fitPoint(a,b,c,state.garmentFit,state.garmentSize,state.garment);positions.push(...f(x,y,z));const derivative=(out,a,b)=>out.fromArray(a).sub(new T.Vector3().fromArray(b)).multiplyScalar(.5/eps);derivative(dx,f(x+eps,y,z),f(x-eps,y,z));derivative(dy,f(x,y+eps,z),f(x,y-eps,z));derivative(dz,f(x,y,z+eps),f(x,y,z-eps));basis.makeBasis(dx,dy,dz);nm.getNormalMatrix(basis);n.fromArray(data.normals,i).applyMatrix3(nm).normalize();normals.push(...n.toArray());}
 cachedFit={key:fitKey,positions,normals};fitGeometryCache.set(data,cachedFit);}
 g.setAttribute('position',new T.Float32BufferAttribute(cachedFit.positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('uv1',new T.Float32BufferAttribute(fabric,2));g.setAttribute('normal',new T.Float32BufferAttribute(cachedFit.normals,3));g.setIndex(data.indices[side]);return g;}
function updateShape(){const shape=(state.garment==='hoodie'?'hoodie':presets[state.fabric].shape)+(state.wrinkles?'':'-smooth');const shapeKey=shape+':'+state.garmentFit+':'+state.garmentSize;const shapeChanged=currentShape!==shapeKey;if(shapeChanged){group.children.forEach(m=>m.geometry.dispose());group.clear();for(const side of ['front','back']){const mesh=new T.Mesh(geometry(shapes[shape],side,side==='lining'),materials[side]);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}if(state.garment==='hoodie'){group.add(new T.Mesh(geometry(shapes[shape],'rib'),ribMaterial));for(const [side,mat] of [['outer',outerMaterial],['lining',liningMaterial]]){const mesh=new T.Mesh(geometry(shapes[shape],side,side==='lining'),mat);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);}for(const side of ['front','back','outer'])group.add(new T.Mesh(geometry(shapes[shape],side,true),liningBackMaterial));}currentShape=shapeKey;}
 const brushed=state.garment==='hoodie'&&state.hoodFabric==='brushed',wool=state.garment==='tshirt'&&state.fabric==='wool';
 const pileKey=shapeKey+':'+(brushed?'brushed':wool?'wool':'none');
 if(fuzz?.userData.key===pileKey)return;
 if(fuzz){scene.remove(fuzz);fuzz.geometry?.dispose();fuzz.material?.dispose();fuzz=null;}
 if(brushed||wool){const surfaces=brushed?[{geometry:group.children[4].geometry},...group.children.slice(5).map(m=>({geometry:m.geometry,reverse:true}))]:group.children.slice(0,2).map(m=>({geometry:m.geometry}));
 fuzz=createFiberPile(surfaces,{density:brushed?18000:4000,length:brushed?.004:.0012,width:brushed?.0005:.00018,color:state.color});fuzz.userData.key=pileKey;scene.add(fuzz);}
}

function drawPrint(ctx,d,x,unit){
 ctx.save();ctx.translate(unit*x,unit*d.vertical/100);ctx.rotate(d.angle*Math.PI/180);const w=unit*d.size/100,h=w*.65;
   if(d.art==='upload'&&d.upload){const ratio=d.upload.width/d.upload.height;ctx.drawImage(d.upload,-w/2,-w/ratio/2,w,w/ratio);}
   else if(d.art==='graphic'){ctx.fillStyle='#da6d42';ctx.beginPath();ctx.arc(-w*.17,0,h*.42,0,Math.PI*2);ctx.fill();ctx.fillStyle='#263e40';ctx.fillRect(0,-h*.42,w*.42,h*.84);ctx.fillStyle='#faf2df';ctx.font=`600 ${w*.065}px sans-serif`;ctx.textAlign='center';ctx.fillText('FORM / TEXTURE',0,h*.68);}
   else{ctx.fillStyle='#28443d';ctx.textAlign='center';ctx.font=`700 ${w*.21}px sans-serif`;ctx.fillText('STUDIO',0,0);ctx.font=`500 ${w*.055}px sans-serif`;ctx.fillText('MATERIAL EXPLORATION',0,h*.21);ctx.fillRect(-w*.43,h*.32,w*.86,w*.009);ctx.font=`400 ${w*.048}px sans-serif`;ctx.fillText('SEOUL     —     2026',0,h*.48);}
 ctx.restore();
}
function paint(){
 const hoodie=state.garment==='hoodie';
 if(hoodie){const ctx=wrapCanvas.getContext('2d'),unit=wrapCanvas.height;ctx.fillStyle=state.color;ctx.fillRect(0,0,wrapCanvas.width,unit);
  for(const d of state.designs.filter(d=>d.art!=='none'))for(const x of atlasCopies(d))drawPrint(ctx,d,x,unit);
  wrapTexture.needsUpdate=true;
 }else for(const side of ['front','back']){const c=composites[side],ctx=c.getContext('2d');ctx.fillStyle=state.color;ctx.fillRect(0,0,c.width,c.height);for(const d of state.designs.filter(d=>d.side===side&&d.art!=='none'))drawPrint(ctx,d,d.horizontal/100,c.width);materials[side].userData.flatTexture.needsUpdate=true;}
 for(const mat of Object.values(materials)){const target=hoodie?wrapTexture:mat.userData.flatTexture;if(mat.map!==target){mat.map=target;mat.needsUpdate=true;}}
}

function apply(){if(!loaded)return;$('horizontal').min=state.garment==='hoodie'?0:25;$('horizontal').max=state.garment==='hoodie'?200:75;$('horizontal').value=state.horizontal;$('wrap-note').hidden=state.garment!=='hoodie';updateShape();const hoodie=state.garment==='hoodie',p=hoodie?hoodPreset:presets[state.fabric],m=maps[hoodie?'hoodOuter':state.fabric];for(const material of Object.values(materials)){material.side=hoodie?T.FrontSide:T.DoubleSide;material.userData.grain=m.grain;if(material.userData.shader)material.userData.shader.uniforms.fabricGrain.value=m.grain;material.normalMap=m.normal;material.normalScale.setScalar(p.normal);material.roughnessMap=m.rough;material.roughness=p.rough;material.sheen=p.sheen;material.sheenColor.set(state.color).lerp(new T.Color('#ffffff'),.28);material.sheenRoughness=.8;material.specularIntensity=!hoodie&&state.fabric==='polyester'?.7:.3;material.anisotropy=!hoodie&&state.fabric==='polyester'?.4:0;material.needsUpdate=true;}
 if(fuzz)fuzz.material.color.set(state.color);if(hoodie){ribMaterial.color.set(state.color);liningMaterial.color.set(state.color);const inner=state.hoodFabric==='terry'?maps.terry:maps.brushed;for(const mat of [liningMaterial,liningBackMaterial]){mat.color.set(state.color);mat.map=inner.lining;mat.normalMap=inner.normal;mat.roughnessMap=inner.rough;mat.normalScale.setScalar(state.hoodFabric==='terry'?.4:.65);mat.needsUpdate=true;}outerMaterial.color.set(state.color);outerMaterial.normalScale.setScalar(hoodPreset.normal);outerMaterial.normalMap=maps.hoodOuter.normal;outerMaterial.roughnessMap=maps.hoodOuter.rough;outerMaterial.map=maps.hoodOuter.lining;outerMaterial.roughness=hoodPreset.rough;outerMaterial.sheen=hoodPreset.sheen;outerMaterial.sheenColor.set(state.color).lerp(new T.Color('#ffffff'),.28);outerMaterial.sheenRoughness=.8;outerMaterial.needsUpdate=true;} updateFabricComparison();$('garment-fit').value=state.garmentFit;$('garment-size').value=state.garmentSize;$('fit-summary').textContent=({female:'여성용',male:'남성용',unisex:'유니섹스'}[state.garmentFit])+' · '+state.garmentSize+' · 시각 비교용 핏 (실측 아님)';$('garment').value=state.garment;$('hood-fabric').value=state.hoodFabric;$('hood-controls').hidden=!hoodie;$('tee-materials').hidden=hoodie;paint();$('material-title').textContent=hoodie?'후드 · '+(state.hoodFabric==='terry'?'쭈리':'기모')+' / 리브':p.title;$('material-note').textContent=state.wrinkles?p.note:'중력 처짐이 없는 기본 의류 · 선택한 원단 표면 적용';document.querySelectorAll('[data-material]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.material===state.fabric)));$('material-title').textContent+=' · '+({female:'여성용',male:'남성용',unisex:'유니섹스'}[state.garmentFit])+' '+state.garmentSize;if(hoodie)$('material-note').textContent='몸판 겉면: 스웨트 저지 · 안쪽: '+(state.hoodFabric==='terry'?'루프 조직':'기모 표면')+' · 소매 끝과 밑단: 별도 리브';$('print-settings').hidden=!designStore.active();$('wrinkles').setAttribute('aria-pressed',String(state.wrinkles));$('shape-note').textContent=state.wrinkles?'주름 있음 · Blender에서 계산한 형태':'주름 없음 · 소매를 펼친 기본 형태';if(hoodie)$('shape-note').textContent=state.wrinkles?'원본 모델의 주름':'원본 주름을 완화한 형태';status(state.wrinkles?'실시간 미리보기 · 주름 있음':'실시간 미리보기 · 주름 없음');}
function fit(){return Math.max(state.garment==='hoodie'?5.2:4.3,(state.ruler?4.5:state.garment==='hoodie'?3.9:3.1)/Math.max(.3,camera.aspect));}
function view(back=false,detail=false){controls.target.set(0,detail?.28:-.05,0);camera.position.set(detail?0:.18,detail?.32:.12,back?-fit():detail?1.1:fit());controls.update();}
function lights(){const detail=state.light==='raking';area.position.set(-2,detail?.6:2.5,detail?.8:2.5);area.intensity=detail?3:3;area.lookAt(0,0,0);fill.intensity=detail?.45:.85;}
async function init(){
 renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.78;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 scene=new T.Scene();scene.background=new T.Color(state.background);rulerGuide=createReferenceRuler();scene.add(rulerGuide);updateBackground();camera=new T.PerspectiveCamera(38,1,.05,30);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=.7;controls.maxDistance=16;controls.autoRotateSpeed=.8;
 RectAreaLightUniformsLib.init();rebuildEnvironment();scene.environmentIntensity=.32;
 area=new T.RectAreaLight(0xfff4df,4,3,4);scene.add(area);fill=new T.RectAreaLight(0xe3edff,1.5,3,4);fill.position.set(2,1,2);fill.lookAt(0,0,0);scene.add(fill);rim=new T.RectAreaLight(0xffffff,1.5,2,3);rim.position.set(1,1,-2);rim.lookAt(0,0,0);scene.add(rim);lights();
 shadow=new T.DirectionalLight(0xfff5e7,1.1);shadow.position.set(-2,3,2);shadow.castShadow=true;shadow.shadow.mapSize.set(2048,2048);Object.assign(shadow.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:.1,far:10});shadow.shadow.bias=-.0002;shadow.shadow.normalBias=.008;shadow.shadow.radius=5;scene.add(shadow);
 const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.12,color:'#554e44'}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.1;floor.receiveShadow=true;scene.add(floor);group=new T.Group();scene.add(group);
 for(const side of ['front','back']){const c=document.createElement('canvas');c.width=c.height=2048;composites[side]=c;const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=16;owned.push(texture);materials[side]=new T.MeshPhysicalMaterial({map:texture,side:T.DoubleSide,metalness:0});materials[side].userData.flatTexture=texture;
const mat=materials[side];mat.onBeforeCompile=shader=>{shader.uniforms.fabricGrain={value:mat.userData.grain};mat.userData.shader=shader;shader.fragmentShader='uniform sampler2D fabricGrain;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb *= texture2D(fabricGrain,vNormalMapUv).rgb;');};mat.customProgramCacheKey=()=> 'fabric-grain-uv1-v1';}

 const restoreExtension=renderer.getContext().getExtension('WEBGL_lose_context');
 recovery=createContextRecovery({canvas,button:$('restore-preview'),notice:$('status'),onInterrupt:()=>printEditor?.cancel(),requestRestore:()=>{if(!restoreExtension)throw Error('복구 확장 미지원');restoreExtension.restoreContext();},rebuild:()=>{
  rebuildEnvironment();shadow.shadow.map?.dispose();shadow.shadow.map=null;
  apply();renderer.render(scene,camera);
 }});
 await Promise.all(['cotton','wool','cotton-smooth','wool-smooth','hoodie','hoodie-smooth'].map(async id=>{const r=await fetch(`assets/${id.startsWith('hoodie')?'':'drape-'}${id}.json`);if(!r.ok)throw Error('의류 파일을 불러오지 못했습니다');shapes[id]=await r.json();}));
 wrapCanvas=document.createElement('canvas');wrapCanvas.width=4096;wrapCanvas.height=2048;wrapTexture=new T.CanvasTexture(wrapCanvas);wrapTexture.colorSpace=T.SRGBColorSpace;wrapTexture.wrapS=T.RepeatWrapping;wrapTexture.anisotropy=16;owned.push(wrapTexture);
 await Promise.all([...Object.keys(presets),'hoodOuter'].map(loadFabric));createHoodMaterials();loaded=true;persistence=createPersistence({state,store:designStore,onRestore:restoreUI,onBeforeRestore:()=>{uploadVersion++;printEditor?.cancel();},isEditing:()=>!!printEditor?.dragging});await persistence.initialize();syncDesignUI();apply();view(state.side==='back');if(!window.studioReadonly)printEditor=createPrintEditor({canvas,camera,controls,group,state,paint,selectDesign});
 const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);const old=fit();camera.aspect=w/h;camera.updateProjectionMatrix();camera.position.sub(controls.target).multiplyScalar(fit()/old).add(controls.target);};new ResizeObserver(resize).observe(canvas);resize();
 renderer.setAnimationLoop(()=>{persistence?.tick();if(recovery?.lost)return;controls.autoRotate=state.auto&&!printEditor?.dragging;if(!printEditor?.dragging)controls.update();printEditor?.update();rulerGuide.userData.update(camera,controls.target,canvas);renderer.render(scene,camera);});

}
$('inside-view').onclick=()=>{if(!loaded)return;printEditor?.cancel();state.auto=false;$('rotate').setAttribute('aria-pressed','false');controls.target.set(0,-.12,0);camera.position.set(.05,-2.15,.18);controls.update();canvas.scrollIntoView({block:'start'});};
$('garment').onchange=e=>{printEditor?.cancel();state.garment=e.target.value;apply();view(state.side==='back');};
for(const [id,key] of [['garment-fit','garmentFit'],['garment-size','garmentSize']])$(id).onchange=e=>{printEditor?.cancel();state[key]=e.target.value;apply();printEditor?.select();};
$('hood-fabric').onchange=e=>{state.hoodFabric=e.target.value;apply();};
document.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{state.fabric=b.dataset.material;apply();});
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{$('color').value=state.color=b.dataset.color;apply();});
function updateBackground(){if(!scene)return;scene.background.set(state.background);const rgb=state.background.slice(1).match(/../g).map(v=>parseInt(v,16));const dark=(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)<160;document.querySelector('.stage').classList.toggle('dark',dark);document.querySelector('.stage').style.background=state.background;$('background-custom').value=state.background;}
$('background').onchange=e=>{if(e.target.value!=='custom'){state.background=e.target.value;updateBackground();}};
$('background-custom').oninput=e=>{state.background=e.target.value;$('background').value='custom';updateBackground();};
$('ruler').onclick=()=>{if(!camera)return;const previous=fit();state.ruler=!state.ruler;rulerGuide.visible=state.ruler;$('ruler').setAttribute('aria-pressed',String(state.ruler));$('ruler-note').hidden=!state.ruler;camera.position.sub(controls.target).multiplyScalar(fit()/previous).add(controls.target);controls.update();};
$('wrinkles').onclick=()=>{state.wrinkles=!state.wrinkles;apply();};
$('color').oninput=e=>{state.color=e.target.value;apply();};
for(const id of ['size','horizontal','vertical','angle'])$(id).oninput=e=>{state[id]=Number(e.target.value);if(loaded)paint();};
$('art').onchange=e=>{state.art=e.target.value;syncDesignUI();apply();};
$('side').onchange=e=>{printEditor?.cancel();designStore.side(e.target.value);syncDesignUI();apply();if(loaded)view(state.side==='back');};
for(const [id,sign] of [['left-view',-1],['right-view',1]])$(id).onclick=()=>{printEditor?.cancel();controls.target.set(0,-.05,0);camera.position.set(sign*fit(),.12,0);controls.update();canvas.scrollIntoView({block:'start'});};
$('front').onclick=()=>switchSide('front');$('back').onclick=()=>switchSide('back');$('detail').onclick=()=>view(false,true);$('rotate').onclick=()=>{$('rotate').setAttribute('aria-pressed',String(state.auto=!state.auto));};$('light').onchange=e=>{state.light=e.target.value;lights();if(loaded)updateFabricComparison();};
function restoreUI(){
 for(const id of ['color','light'])$(id).value=state[id];
 $('background').value=[...$('background').options].some(o=>o.value===state.background)?state.background:'custom';
 $('rotate').setAttribute('aria-pressed',String(state.auto));$('ruler').setAttribute('aria-pressed',String(state.ruler));$('ruler-note').hidden=!state.ruler;rulerGuide.visible=state.ruler;
 $('upload').value='';$('upload-error').textContent='';updateBackground();lights();syncDesignUI();apply();view(state.side==='back');printEditor?.select();
}
function syncDesignUI(){
 $('horizontal').min=state.garment==='hoodie'?0:25;$('horizontal').max=state.garment==='hoodie'?200:75;

 const active=designStore.active(),list=$('design-list');list.replaceChildren();
 for(const d of state.designs.filter(d=>d.side===state.side)){
  const b=document.createElement('button');b.type='button';b.className='design-row';b.textContent=`${d.name} #${d.id}`;b.setAttribute('aria-pressed',String(d.id===state.activeId));b.onclick=()=>selectDesign(d.id);list.append(b);
 }
 if(!list.children.length){const p=document.createElement('p');p.className='muted';p.textContent='이 면에는 나염이 없습니다. 아래에서 추가하세요.';list.append(p);}
 $('design-summary').textContent=`앞면 ${state.designs.filter(d=>d.side==='front').length}개 · 뒷면 ${state.designs.filter(d=>d.side==='back').length}개`;
 $('side').value=state.side;$('delete-design').disabled=!active;$('art').disabled=!active||active.art==='upload';
 $('art').querySelector('[value=upload]')?.remove();if(active?.upload)$('art').add(new Option('내 이미지','upload'));
 for(const id of ['art','size','horizontal','vertical','angle'])$(id).value=state[id];
 $('print-settings').hidden=!active;$('selected-design').textContent=active?`선택: ${active.name} #${active.id}`:'선택된 나염 없음';
}
function selectDesign(id){printEditor?.cancel();designStore.select(id);syncDesignUI();printEditor?.select();}
function switchSide(side){printEditor?.cancel();designStore.side(side);syncDesignUI();if(loaded)view(side==='back');}
for(const [id,art] of [['add-type','type'],['add-graphic','graphic']])$(id).onclick=()=>{if(state.designs.length>=20){$('upload-error').textContent='나염은 최대 20개입니다.';return;}printEditor?.cancel();designStore.add(art);syncDesignUI();if(loaded){paint();view(state.side==='back');}};
$('delete-design').onclick=()=>{printEditor?.cancel();designStore.remove();syncDesignUI();if(loaded)paint();};
syncDesignUI();
let uploadVersion=0;
$('upload').onchange=async e=>{const version=++uploadVersion,file=e.target.files[0],targetSide=state.side;$('upload-error').textContent='';if(!file)return;if(state.designs.length>=20){$('upload-error').textContent='나염은 최대 20개입니다.';return;}if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){$('upload-error').textContent='2MiB 이하 PNG·JPG·WebP 파일을 선택하세요.';return;}
 try{const image=await createImageBitmap(file);if(version!==uploadVersion){image.close();return;}if(image.width*image.height>24e6){image.close();throw Error('이미지 해상도가 너무 큽니다. 2400만 픽셀 이하로 줄여주세요.');}printEditor?.cancel();designStore.add('upload',targetSide,image,file.name.slice(0,120)).sourceBlob=file;syncDesignUI();apply();if(loaded)view(targetSide==='back');$('upload').value='';}catch(e){if(version===uploadVersion)$('upload-error').textContent=e.message||'이미지를 읽지 못했습니다.';}};
$('reset').onclick=()=>{uploadVersion++;printEditor?.cancel();designStore.reset();Object.assign(state,{garment:'tshirt',hoodFabric:'terry',garmentFit:'unisex',garmentSize:'M',fabric:'cotton',color:'#e3dfd3',art:'type',side:'front',size:43,horizontal:50,vertical:43,angle:0,upload:null,auto:false,light:'studio',wrinkles:false,background:'#858b90',ruler:false});for(const id of ['color','art','side','size','horizontal','vertical','angle','light'])$(id).value=state[id];$('art').querySelector('[value=upload]')?.remove();$('upload').value='';$('upload-error').textContent='';$('rotate').setAttribute('aria-pressed','false');$('background').value=state.background;$('ruler').setAttribute('aria-pressed','false');$('ruler-note').hidden=true;rulerGuide.visible=false;updateBackground();lights();syncDesignUI();apply();view();};
init().catch(e=>{status('미리보기를 시작하지 못했습니다: '+e.message);console.error(e);});

function createHoodMaterials(){
 const microCanvas=imageCanvas(maps.cotton.sourceDiffuse.image),microContext=microCanvas.getContext('2d');const micro={data:microContext.getImageData(0,0,microCanvas.width,microCanvas.height).data,width:microCanvas.width,height:microCanvas.height};
 for(const kind of ['rib','terry']){
  const m=buildHoodKnitMaps(kind,1024,micro),n=m.width;
  const nt=texturePixels(m.normal,n,n),dt=texturePixels(m.diffuse,n,n),rt=texturePixels(m.roughness,n,n);
  for(const t of [nt,dt,rt]){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(kind==='rib'?2:4);t.channel=1;t.anisotropy=8;}
  maps[kind]={normal:nt,grain:dt,rough:rt,previewSpan:kind==='rib'?1:.8};
 }
 ribMaterial=new T.MeshPhysicalMaterial({map:maps.rib.grain,normalMap:maps.rib.normal,normalScale:new T.Vector2(.28,.28),roughness:.94,sheen:.35,side:T.DoubleSide});
 const bm=buildBrushedMaps();maps.brushed={normal:texturePixels(bm.normal,bm.width,bm.height),rough:texturePixels(bm.roughness,bm.width,bm.height),grain:texturePixels(bm.diffuse,bm.width,bm.height)};for(const t of Object.values(maps.brushed)){t.channel=1;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(3);t.anisotropy=8;}
 for(const id of ['cotton','hoodOuter','terry','sweat','brushed']){const m=maps[id],t=m.grain.clone();t.channel=1;t.repeat.copy(m.normal.repeat);t.needsUpdate=true;m.lining=t;owned.push(t);}
 liningMaterial=new T.MeshPhysicalMaterial({side:T.DoubleSide,roughness:.98,sheen:.6,specularIntensity:.15});
 liningBackMaterial=liningMaterial.clone();liningBackMaterial.side=T.BackSide;
 outerMaterial=new T.MeshPhysicalMaterial({side:T.FrontSide,roughness:.91,sheen:.32,specularIntensity:.3,normalScale:new T.Vector2(.6,.6)});
}

// Real-time PBR comparison: same material parameters/maps, no baked directional shading.
let swatchRenderer;
function drawFabricSwatch(canvas,map,source,pile=false){
 if(!swatchRenderer){swatchRenderer=new T.WebGLRenderer({antialias:true,alpha:false});swatchRenderer.setSize(512,512);swatchRenderer.setPixelRatio(1);swatchRenderer.outputColorSpace=renderer.outputColorSpace;swatchRenderer.toneMapping=renderer.toneMapping;swatchRenderer.toneMappingExposure=renderer.toneMappingExposure;}
 const preview=new T.Scene();preview.background=new T.Color('#b9bfc2');preview.environment=scene.environment;preview.environmentIntensity=scene.environmentIntensity;
 for(const light of [area,fill,rim,shadow]){const copy=light.clone();copy.castShadow=false;preview.add(copy);}
 const mat=new T.MeshPhysicalMaterial();for(const key of ['normalMap','roughnessMap','roughness','metalness','sheen','sheenRoughness','specularIntensity','anisotropy'])mat[key]=source[key];mat.normalScale.copy(source.normalScale);mat.onBeforeCompile=()=>{};mat.customProgramCacheKey=()=> 'fabric-swatch-pbr';mat.side=T.DoubleSide;mat.color.set($('swatch-mode').value==='color'?state.color:'#a1a7ab');mat.sheenColor.copy(mat.color).lerp(new T.Color('#ffffff'),.28);
 const grain=map.grain.clone();grain.channel=1;grain.repeat.copy(map.normal.repeat);grain.needsUpdate=true;mat.map=grain;
 const geo=new T.PlaneGeometry(.18,.18,48,48),pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,-1.8*(x*x+y*y));}geo.computeVertexNormals();
 const uv=geo.attributes.uv.clone(),span=map.previewSpan??.35;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*span/map.normal.repeat.x,uv.getY(i)*span/map.normal.repeat.y);geo.setAttribute('uv1',uv);
 preview.add(new T.Mesh(geo,mat));let fibers;if(pile){fibers=createFiberPile([{geometry:geo}],{density:pile==='wool'?4000:18000,length:pile==='wool'?.0012:.004,width:pile==='wool'?.00018:.0005,color:mat.color});preview.add(fibers);}
 const cam=new T.PerspectiveCamera(38,1,.01,10);cam.position.set(0,0,.29);cam.lookAt(0,0,0);swatchRenderer.render(preview,cam);canvas.width=canvas.height=512;canvas.getContext('2d').drawImage(swatchRenderer.domElement,0,0);
 fibers?.geometry.dispose();fibers?.material.dispose();geo.dispose();mat.dispose();grain.dispose();
}
function updateFabricComparison(){
 if(!loaded)return;const hoodie=state.garment==='hoodie';
 $('inner-swatch-card').hidden=$('rib-swatch-card').hidden=!hoodie;
 $('fabric-swatches').classList.toggle('single',!hoodie);
 $('outer-swatch-label').textContent=hoodie?'겉면':presets[state.fabric].title+' · 표면';
 drawFabricSwatch($('outer-swatch'),maps[hoodie?'hoodOuter':state.fabric],hoodie?outerMaterial:materials.front,!hoodie&&state.fabric==='wool'?'wool':false);
 if(hoodie){const inner=state.hoodFabric==='terry'?maps.terry:maps.brushed;drawFabricSwatch($('inner-swatch'),inner,liningMaterial,state.hoodFabric==='brushed');drawFabricSwatch($('rib-swatch'),maps.rib,ribMaterial);}
 const descriptions={cotton:'면 저지: 잔잔한 편직 조직과 매트한 표면. 면 저지 스캔 기반 표현입니다.',wool:'울 저지: 티셔츠용 고운 편직과 짧은 잔털. 수식 기반 참고 재질이며 실측 메리노 원단은 아닙니다.',polyester:'운동복 폴리에스터 니트: 촘촘한 인터록 조직과 은은한 광택. 수식 기반 표현입니다.',sweat:'스웨트: 니트 플리스 스캔의 표면을 사용한 참고 표현입니다.'};
 $('fabric-description').textContent=hoodie?'겉면: 스웨트 스캔 · 안쪽: '+(state.hoodFabric==='terry'?'쭈리 루프':'기모 보풀층')+' · 소매 끝·밑단: 리브. 겉면은 Poly Haven Jogging Melange 스캔, 쭈리·리브는 고리/골 구조와 면 스캔의 미세 표면을 결합한 참고 재질입니다.':descriptions[state.fabric];
}
$('swatch-mode').onchange=updateFabricComparison;
