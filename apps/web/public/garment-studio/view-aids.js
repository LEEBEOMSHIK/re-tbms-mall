import * as T from 'three';

// Display-only scale: 1 model unit = assumed 40 cm, not measured dimensions.
export function createReferenceRuler(){
 const group=new T.Group(), lines=[], labels=[];
 const overlay=document.createElement('div');
 Object.assign(overlay.style,{position:'absolute',inset:'0',pointerEvents:'none',overflow:'hidden'});
 overlay.setAttribute('aria-hidden','true');document.querySelector('.stage').append(overlay);
 for(let i=0;i<=8;i++){
  const y=-1+i*.25;lines.push(-1.32,y,0,-1.20,y,0);
  const label=document.createElement('span');label.textContent=String(i*10);
  Object.assign(label.style,{position:'absolute',font:'600 14px system-ui,sans-serif',lineHeight:'24px',minWidth:'32px',textAlign:'center',color:'#25312c',background:'#f6f5ef',borderRadius:'3px',transform:'translate(-100%,-50%)'});
  overlay.append(label);labels.push({label,point:new T.Vector3(-1.38,y,0)});
 }
 lines.push(-1.27,-1,0,-1.27,1,0);
 for(let i=0;i<=8;i++){const y=-1+i*.25;lines.push(-1.1,y,0,1.1,y,0);}
 for(let i=-4;i<=4;i++)lines.push(i*.25,-1,0,i*.25,1,0);
 // Opaque depth-tested lines always behind the garment, including rear views.
 group.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(lines,3)),new T.LineBasicMaterial({color:'#9ba7aa',toneMapped:false,depthWrite:false})));
 const direction=new T.Vector3(),projected=new T.Vector3();
 group.userData.update=(camera,target,canvas)=>{
  overlay.hidden=!group.visible;if(!group.visible)return;
  camera.getWorldDirection(direction);group.position.copy(target).addScaledVector(direction,2);group.quaternion.copy(camera.quaternion);group.scale.setScalar(1+2/camera.position.distanceTo(target));group.updateMatrixWorld(true);
  const w=canvas.clientWidth,h=canvas.clientHeight;
  for(const {label,point} of labels){projected.copy(point).applyMatrix4(group.matrixWorld).project(camera);const x=(projected.x+1)*w/2,y=(1-projected.y)*h/2;label.hidden=y<165||y>h-125||projected.z>1;label.style.left=`${Math.max(44,Math.min(w-12,x))}px`;label.style.top=`${Math.round(y)}px`;}
 };
 group.visible=false;overlay.hidden=true;return group;
}
