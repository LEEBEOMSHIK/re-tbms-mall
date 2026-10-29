const settingsKeys=['garmentFit','garmentSize','garment','hoodFabric','fabric','color','wrinkles','background','ruler','light','auto'];
export function snapshot(state){return {version:2,savedAt:new Date().toISOString(),settings:Object.fromEntries(settingsKeys.map(k=>[k,state[k]])),activeId:state.activeId,editSide:state.editSide,designs:state.designs.map(d=>({id:d.id,side:d.side,name:d.name,art:d.art,size:d.size,horizontal:d.horizontal,wrapHorizontal:d.wrapHorizontal,vertical:d.vertical,angle:d.angle,sourceBlob:d.sourceBlob||null}))};}
export function validate(record){
 const fail=()=>{throw Error('저장 데이터 형식이 올바르지 않습니다. 현재 작업은 유지됩니다.');};
 if(!record||![1,2].includes(record.version)||!Array.isArray(record.designs))fail();
 const s=record.settings;if(s?.garmentFit!==undefined&&!['female','male','unisex'].includes(s.garmentFit))fail();if(s?.garmentSize!==undefined&&!['S','M','L','XL'].includes(s.garmentSize))fail();if(s?.garment!==undefined&&!['tshirt','hoodie'].includes(s.garment))fail();if(s?.hoodFabric!==undefined&&!['terry','brushed'].includes(s.hoodFabric))fail();if(!s||!['cotton','wool','polyester','sweat'].includes(s.fabric)||!['studio','raking'].includes(s.light))fail();
 for(const k of ['color','background'])if(!/^#[\da-f]{6}$/i.test(s[k]))fail();
 for(const k of ['wrinkles','ruler','auto'])if(typeof s[k]!=='boolean')fail();
 if(!['front','back'].includes(record.editSide))fail();
 const ids=new Set();for(const d of record.designs){if(!Number.isSafeInteger(d.id)||d.id<1||ids.has(d.id)||typeof d.name!=='string'||!['front','back'].includes(d.side)||!['type','graphic','upload','none'].includes(d.art))fail();ids.add(d.id);
  for(const [k,min,max] of [['size',15,70],['horizontal',25,75],['vertical',30,75],['angle',-180,180]])if(!Number.isFinite(d[k])||d[k]<min||d[k]>max)fail();
  if(d.wrapHorizontal!==undefined&&(record.version!==2||!Number.isFinite(d.wrapHorizontal)||d.wrapHorizontal<0||d.wrapHorizontal>200))fail();
  if(d.sourceBlob!==null&&!(d.sourceBlob instanceof Blob))fail();if(d.art==='upload'&&!d.sourceBlob)fail();
 }
 if(record.activeId!==null&&!record.designs.some(d=>d.id===record.activeId&&d.side===record.editSide))fail();
 return record;
}
export function fingerprint(state){const r=snapshot(state);delete r.savedAt;return JSON.stringify(r,(k,v)=>k==='sourceBlob'?v&&[v.size,v.type]:v);}
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('fabric-study-sample',1);r.onupgradeneeded=()=>r.result.createObjectStore('work');r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('다른 샘플 탭을 닫고 다시 시도하세요.'));r.onsuccess=()=>resolve(r.result);});}
async function transaction(mode,action){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('work',mode),store=tx.objectStore('work');let result;action(store,v=>result=v);tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error||Error('저장이 취소되었습니다.'));tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
const read=key=>transaction('readonly',(s,result)=>{const r=s.get(key);r.onsuccess=()=>result(r.result);});
const write=(record,manual)=>transaction('readwrite',s=>{s.put(record,'draft');if(manual)s.put(record,'saved');});
export function createPersistence({state,store,onRestore,onBeforeRestore,isEditing}){
 const output=document.getElementById('save-result'),saveButton=document.getElementById('save-work'),loadButton=document.getElementById('load-work');
 let ready=false,blocked=false,last='',observed='',timer,queue=Promise.resolve(),busy=false;
 function message(text,error=false){output.textContent=text;output.dataset.error=String(error);}
 function lock(value){busy=value;document.querySelector('main').inert=value;saveButton.disabled=loadButton.disabled=value;}
 async function restoreRecord(record,afterReplace=()=>{}){validate(record);const decoded=[];try{for(const d of record.designs){const upload=d.sourceBlob?await createImageBitmap(d.sourceBlob):null;if(upload&&upload.width*upload.height>24e6){upload.close();throw Error('저장된 이미지가 너무 큽니다.');}decoded.push({...d,upload});}}catch(e){decoded.forEach(d=>d.upload?.close());throw e;}
  store.replace(decoded,record.activeId,record.editSide);afterReplace();Object.assign(state,{garment:'tshirt',hoodFabric:'terry',garmentFit:'female',garmentSize:'M'},record.settings,{garmentFit:record.settings.garmentFit??'female',garmentSize:record.settings.garmentSize??'M'});onRestore();last=observed=fingerprint(state);blocked=false;
 }
 function save(manual=false){clearTimeout(timer);if(!ready||busy||(!manual&&blocked))return queue;
  const record=snapshot(state),key=fingerprint(state);message('저장 중… 이 탭을 잠시 유지해 주세요.');
  queue=queue.catch(()=>{}).then(async()=>{try{validate(record);await write(record,manual);last=key;blocked=false;message(`${manual?'저장본 저장':'자동 저장'} 완료 · ${new Date(record.savedAt).toLocaleTimeString('ko-KR')} · 새로고침 후에도 복원됩니다.`);}catch(e){blocked=true;message('저장 실패 · 현재 작업은 화면에 유지됩니다. 저장 버튼으로 다시 시도하세요. '+e.message,true);}});return queue;
 }
 async function load(initial=false){
  clearTimeout(timer);lock(true);onBeforeRestore();let restored=false,previousLast=last;
  try{await queue;previousLast=last;const record=initial?await read('draft'):(await read('saved')||await read('draft'));
   if(record){await restoreRecord(record,()=>{restored=true;});
    if(!initial){last=previousLast;await write(snapshot(state),false);last=observed=fingerprint(state);}
    message(`불러오기 완료 · 앞면 ${state.designs.filter(d=>d.side==='front').length}개 / 뒷면 ${state.designs.filter(d=>d.side==='back').length}개 · 원단·색상·나염 설정 복원`);
   }else{if(initial)last=observed=fingerprint(state);message(initial?'자동 저장 준비됨 · 편집 내용은 이 브라우저에 저장됩니다.':'저장본이 없습니다. 현재 작업은 유지됩니다.');}
  }catch(e){blocked=true;last=previousLast;message(restored?'불러오기는 완료됐지만 자동 저장에 실패했습니다. 화면의 작업을 저장 버튼으로 다시 저장하세요. '+e.message:'불러오기 실패 · 현재 작업과 기존 저장본은 유지됩니다. '+e.message,true);}
  finally{ready=true;lock(false);}
 }
 saveButton.onclick=()=>{onBeforeRestore();save(true);};loadButton.onclick=()=>load();
 window.addEventListener('beforeunload',e=>{if(ready&&(fingerprint(state)!==last)){e.preventDefault();e.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});
 return {initialize:()=>load(true),tick(){if(!ready||busy||blocked||isEditing())return;const key=fingerprint(state);if(key!==observed){observed=key;clearTimeout(timer);message('변경 내용 저장 대기 중…');timer=setTimeout(()=>save(),300);}},save};
}
