import {snapshot, fingerprint} from './persistence.js';
const channel='garment-admin-v1';
const send=(type,data={})=>parent.postMessage({channel,type,...data},location.origin);
// The administrator owns authentication, asset uploads and durable server saves.
export function createPersistence({state,store,onRestore,onBeforeRestore,isEditing}){
 let ready=false,last='',saved='',locked=false,initToken=0;
 function capture(){const value=snapshot(state);delete value.savedAt;value.designs.forEach((d,i)=>{if(state.designs[i].asset_id)d.asset_id=state.designs[i].asset_id;});return value;}
 let resolveInit;
 const initialized=new Promise(resolve=>{resolveInit=resolve;});
 window.addEventListener('message',async event=>{
  if(event.origin!==location.origin||event.source!==parent||event.data?.channel!==channel)return;
  const message=event.data;
  try{
   if(message.type==='cancel-init'){initToken++;return;}
   if(message.type==='init'){
    const token=++initToken;onBeforeRestore();const decoded=[];
    try{for(const d of message.studio.designs){let sourceBlob=null,upload=null;
     if(d.art==='upload'){
      const path=message.assets[d.asset_id];const url=new URL(path,location.origin);
      if(url.origin!==location.origin||!url.pathname.startsWith('/api/admin/designs/'))throw Error('허용되지 않은 나염 이미지 경로입니다.');
      const response=await fetch(url,{credentials:'same-origin'});if(!response.ok)throw Error('나염 이미지를 불러오지 못했습니다.');
      sourceBlob=await response.blob();upload=await createImageBitmap(sourceBlob);
     }decoded.push({...d,sourceBlob,upload});
    }}catch(error){decoded.forEach(d=>d.upload?.close());throw error;}
    if(token!==initToken){decoded.forEach(d=>d.upload?.close());return;}
    store.replace(decoded,message.studio.activeId,message.studio.editSide);Object.assign(state,message.studio.settings);
    window.studioReadonly=!!message.readonly;document.body.classList.toggle('readonly',window.studioReadonly);document.querySelector('.title p').textContent=window.studioReadonly?'드래그: 옷 회전 · 스크롤: 확대':'나염 드래그: 이동 · 빈 곳 드래그: 옷 회전';
    onRestore();ready=true;last=saved=fingerprint(state);resolveInit();send('initialized',{requestId:message.requestId});send('change',{studio:capture()});
   }else if(message.type==='snapshot'&&ready){onBeforeRestore();send('snapshot',{requestId:message.requestId,studio:capture()});
   }else if(message.type==='lock'){locked=!!message.locked;document.querySelector('main').inert=locked;if(locked)onBeforeRestore();
   }else if(message.type==='saved'&&ready){
    for(const d of state.designs){const persisted=message.studio.designs.find(x=>x.id===d.id);if(persisted?.asset_id)d.asset_id=persisted.asset_id;}
    last=saved=fingerprint(state);
   }
  }catch(error){send('error',{requestId:message.requestId,message:error.message||'3D 디자인을 불러오지 못했습니다.'});}
 });
 window.addEventListener('beforeunload',event=>{if(ready&&!window.studioReadonly&&fingerprint(state)!==saved){event.preventDefault();event.returnValue='';}});
 return {initialize(){send('ready');return initialized;},tick(){if(!ready||locked||window.studioReadonly||isEditing())return;const key=fingerprint(state);if(key!==last){last=key;send('change',{studio:capture()});}}};
}
