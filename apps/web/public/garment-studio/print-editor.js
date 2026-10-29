import {wrap,centerU,deltaU} from './wrap-print.js';
import * as T from 'three';

export function createPrintEditor({canvas,camera,controls,group,state,paint,selectDesign}){
 const stage=canvas.parentElement,ray=new T.Raycaster(),pointer=new T.Vector2();
 const overlay=document.createElement('div');overlay.className='print-editor';
 overlay.innerHTML='<svg class="print-outline"><polygon fill="none" stroke="#167dce" stroke-width="2" stroke-dasharray="5 4"/></svg><button class="print-handle print-scale" aria-label="나염 크기 조절" title="드래그: 크기 조절 · 방향키: 크기 변경">↔</button><button class="print-handle print-turn" aria-label="나염 회전 조절" title="드래그: 회전 · 방향키: 회전 변경">↻</button>';
 stage.append(overlay);
 const polygon=overlay.querySelector('polygon'),scale=overlay.querySelector('.print-scale'),turn=overlay.querySelector('.print-turn');
 let selected=true,gesture=null,centerScreen=null,dirty=true;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const sync=()=>{for(const id of ['horizontal','vertical','size','angle'])document.getElementById(id).value=state[id];dirty=true;};
 const rect=()=>canvas.getBoundingClientRect();
 function hit(e){const r=rect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);return ray.intersectObjects(group.children,false)[0];}
 const wrapped=()=>state.garment==='hoodie';
 const bodyHit=h=>h&&(h.object===group.children[0]||h.object===group.children[1]);
 const hitUV=h=>new T.Vector2(wrapped()?wrap(h.uv.x*2):h.uv.x,1-h.uv.y);
 function uvHit(e){const h=hit(e);return (wrapped()?bodyHit(h):h&&h.object===group.children[state.side==='front'?0:1])?hitUV(h):null;}
 function bounds(d=state){const w=d.size/100;return {w,h:d.art==='upload'&&d.upload?w*d.upload.height/d.upload.width:w*(d.art==='graphic'?.9:.65)};}
 function inside(p,d=state){const {w,h}=bounds(d),a=-d.angle*Math.PI/180,dx=wrapped()?deltaU(p.x,centerU(d)):p.x-d.horizontal/100,dy=p.y-d.vertical/100;return Math.abs(dx*Math.cos(a)-dy*Math.sin(a))<=w/2&&Math.abs(dx*Math.sin(a)+dy*Math.cos(a))<=h/2;}
 function finish(cancel=false){if(!gesture)return;if(cancel){Object.assign(state,gesture.original);sync();}const ending=gesture;gesture=null;ending.element.releasePointerCapture?.(ending.id);controls.enabled=true;canvas.style.cursor='';}
 function start(e,mode){if(e.button!==0||gesture)return;
  if(mode==='move'){const raw=hit(e),h=raw&&(raw.object===group.children[0]||raw.object===group.children[1])?raw:null,side=h?.object===group.children[0]?'front':'back',p=h?hitUV(h):null;
   const active=selected?state.designs.find(d=>d.id===state.activeId):null;
   const candidates=active?[active,...[...state.designs].reverse().filter(d=>d!==active)]:[...state.designs].reverse();
   const d=p?candidates.find(d=>(wrapped()||d.side===side)&&d.art!=='none'&&inside(p,d)):null;
   if(!d){selected=false;return;}selectDesign(d.id);
  }
  if(state.art==='none')return;const p=uvHit(e);
  e.preventDefault();e.stopImmediatePropagation();selected=true;state.auto=false;document.getElementById('rotate').setAttribute('aria-pressed','false');controls.autoRotate=false;controls.enabled=false;
  // Drain OrbitControls damping before freezing so editing cannot rotate the shirt.
  controls.enableDamping=false;controls.update();controls.enableDamping=true;
  const r=rect(),c=centerScreen||{x:e.clientX-r.left,y:e.clientY-r.top};
  gesture={id:e.pointerId,element:e.currentTarget,mode,p,center:{x:c.x+r.left,y:c.y+r.top},original:Object.fromEntries(['horizontal','vertical','size','angle'].map(k=>[k,state[k]]))};
  gesture.radius=Math.hypot(e.clientX-gesture.center.x,e.clientY-gesture.center.y)||1;gesture.angle=Math.atan2(e.clientY-gesture.center.y,e.clientX-gesture.center.x);e.currentTarget.setPointerCapture(e.pointerId);
 }
 function move(e){if(!gesture||e.pointerId!==gesture.id)return;e.preventDefault();e.stopImmediatePropagation();const g=gesture;
  if(g.mode==='move'){const p=uvHit(e);if(!p)return;state.horizontal=wrapped()?wrap(g.original.horizontal/100+deltaU(p.x,g.p.x))*100:clamp(g.original.horizontal+(p.x-g.p.x)*100,25,75);state.vertical=clamp(g.original.vertical+(p.y-g.p.y)*100,30,75);}
  else if(g.mode==='scale')state.size=clamp(g.original.size*Math.hypot(e.clientX-g.center.x,e.clientY-g.center.y)/g.radius,15,70);
  else{const a=Math.atan2(e.clientY-g.center.y,e.clientX-g.center.x)-g.angle;const delta=Math.atan2(Math.sin(a),Math.cos(a))*180/Math.PI;state.angle=((g.original.angle+delta+540)%360)-180;}
  sync();
 }
 for(const [element,mode] of [[canvas,'move'],[scale,'scale'],[turn,'rotate']]){
  element.addEventListener('pointerdown',e=>start(e,mode),true);element.addEventListener('pointermove',move,true);
  element.addEventListener('pointerup',e=>{if(gesture?.id===e.pointerId){e.stopImmediatePropagation();finish();}},true);
  element.addEventListener('pointercancel',()=>finish(true),true);element.addEventListener('lostpointercapture',()=>finish(),true);
 }
 window.addEventListener('blur',()=>finish(true));window.addEventListener('keydown',e=>{if(e.key==='Escape'){finish(true);selected=false;}});
 for(const [button,key] of [[scale,'size'],[turn,'angle']])button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();state[key]=clamp(state[key]+(['ArrowRight','ArrowUp'].includes(e.key)?1:-1)*(e.shiftKey?5:1),key==='size'?15:-180,key==='size'?70:180);sync();});
 // Resolve print UVs to the current garment triangles, including draped surfaces.
 function surface(u,v){
 const target=wrapped()?wrap(u)/2:u;
 const meshes=wrapped()?group.children.slice(0,2):[group.children[state.side==='front'?0:1]];
 for(const mesh of meshes){const g=mesh.geometry,uv=g.attributes.uv,pos=g.attributes.position,ids=g.index.array;
 for(const shift of (wrapped()?[-1,0,1]:[0])){u=target+shift;
  for(let i=0;i<ids.length;i+=3){const a=ids[i],b=ids[i+1],c=ids[i+2],ax=uv.getX(a),ay=uv.getY(a),bx=uv.getX(b)-ax,by=uv.getY(b)-ay,cx=uv.getX(c)-ax,cy=uv.getY(c)-ay,det=bx*cy-by*cx;if(Math.abs(det)<1e-10)continue;const s=((u-ax)*cy-(v-ay)*cx)/det,t=(bx*(v-ay)-by*(u-ax))/det;if(s>=-1e-5&&t>=-1e-5&&s+t<=1.00001)return new T.Vector3().fromBufferAttribute(pos,a).multiplyScalar(1-s-t).addScaledVector(new T.Vector3().fromBufferAttribute(pos,b),s).addScaledVector(new T.Vector3().fromBufferAttribute(pos,c),t);}
  }}return null;
 }
 function screen(p){p.project(camera);return {x:(p.x+1)*canvas.clientWidth/2,y:(1-p.y)*canvas.clientHeight/2};}
 let cacheKey='',points=null;
 return {select:()=>{selected=true;cacheKey='';},cancel:()=>finish(true),get dragging(){return !!gesture;},update(){
  if(dirty){paint();dirty=false;}
  if(!group.children.length)return;
  const key=[state.activeId,state.art,state.side,state.size,state.horizontal,state.vertical,state.angle,state.garment,state.garmentFit,state.garmentSize,state.wrinkles,state.fabric,state.upload?.width,state.upload?.height].join('|');
  if(key!==cacheKey){selected=true;cacheKey=key;const {w,h}=bounds(),a=state.angle*Math.PI/180;const u=wrapped()?centerU(state):state.horizontal/100,v=1-state.vertical/100,c=surface(u,v),du=surface(u+.005,v),dv=surface(u,v+.005);
   points=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2],[0,0]].map(([x,y])=>{const dx=x*Math.cos(a)-y*Math.sin(a),dy=-(x*Math.sin(a)+y*Math.cos(a));return surface(u+dx,v+dy)||(c&&du&&dv?c.clone().addScaledVector(du.clone().sub(c),dx/.005).addScaledVector(dv.clone().sub(c),dy/.005):null);});}
  const center=points?.[4];let visible=selected&&state.art!=='none'&&points?.every(Boolean);
  if(visible){const toward=center.clone().sub(camera.position).normalize();ray.set(camera.position,toward);const first=ray.intersectObjects(group.children,false)[0];visible=(wrapped()?bodyHit(first):first?.object===group.children[state.side==='front'?0:1])&&first.point.distanceTo(center)<.035;}
  overlay.hidden=!visible;if(!visible)return;
  const q=points.map(p=>screen(p.clone()));centerScreen=q[4];polygon.setAttribute('points',q.slice(0,4).map(p=>`${p.x},${p.y}`).join(' '));
  for(const [button,p] of [[scale,q[2]],[turn,{x:(q[0].x+q[1].x)/2,y:(q[0].y+q[1].y)/2-32}]]){button.style.left=`${clamp(p.x,22,canvas.clientWidth-22)}px`;button.style.top=`${clamp(p.y,165,canvas.clientHeight-115)}px`;}
 }};
}
