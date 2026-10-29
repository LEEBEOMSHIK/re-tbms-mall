'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {SaveResult} from '@/components/ui/save-result';
import {KeyFacts} from '@/components/ui/key-facts';
import {DesignShell} from './designer-pages';
import {assetUrls,designRequest,DesignError,errorMessage,readFile} from './client';
import {rememberDesignSave} from './receipt';
import type {AssetMeta,DesignRecord} from './model';
import {studioDocument,studioKey,type StudioState} from './studio-model';
const CHANNEL='garment-admin-v1';
export function StudioAdmin({initial,edit}:{initial:DesignRecord;edit:boolean}){
 const frame=useRef<HTMLIFrameElement>(null);
 const [record,setRecord]=useState(initial),recordRef=useRef(initial);
 const [name,setName]=useState(initial.name),[ready,setReady]=useState(false),[dirty,setDirty]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[saved,setSaved]=useState<DesignRecord|null>(null);
 const draft=useRef(initial.document.studio!),busy=useRef(false);
 const initWaiter=useRef<{id:string;resolve:()=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}|null>(null);
 const waiter=useRef<{id:string;resolve:(s:StudioState)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}|null>(null);
 const request=useRef<{path:string;method:string;body:object;key:string}|null>(null);
 const uploads=useRef(new Map<number,{hash:string;request_id:string;asset?:AssetMeta}>());
 function send(message:object){frame.current?.contentWindow?.postMessage({channel:CHANNEL,...message},location.origin);}
 useEffect(()=>{
  function message(e:MessageEvent){
   if(e.origin!==location.origin||e.source!==frame.current?.contentWindow||e.data?.channel!==CHANNEL)return;
   const m=e.data;
   if(m.type==='ready'){send({type:'init',studio:recordRef.current.document.studio,assets:assetUrls(recordRef.current),readonly:!edit});return;}
   if(m.type==='error'){const message=String(m.message||'미리보기를 준비하지 못했습니다.');const waiting=initWaiter.current;if(waiting){clearTimeout(waiting.timer);initWaiter.current=null;waiting.reject(Error(message));}else setError(message);return;}
   if(m.type==='initialized'){const waiting=initWaiter.current;if(waiting&&waiting.id===m.requestId){clearTimeout(waiting.timer);initWaiter.current=null;waiting.resolve();}return;}
   if(initWaiter.current&&m.type==='change')return;
   if((m.type==='change'||m.type==='snapshot')&&m.studio?.version===2&&Array.isArray(m.studio.designs)){
    draft.current=m.studio;setReady(true);
    if(edit){setDirty(studioKey(m.studio)!==studioKey(recordRef.current.document.studio!));if(!busy.current){request.current=null;setSaved(null);}}
    const waiting=waiter.current;if(m.type==='snapshot'&&waiting&&waiting.id===m.requestId){clearTimeout(waiting.timer);waiting.resolve(m.studio);waiter.current=null;}
   }
  }
  window.addEventListener('message',message);
  return()=>{window.removeEventListener('message',message);if(initWaiter.current){clearTimeout(initWaiter.current.timer);initWaiter.current.reject(Error('편집 화면이 닫혔습니다.'));initWaiter.current=null;}if(waiter.current){clearTimeout(waiter.current.timer);waiter.current.reject(Error('편집 화면이 닫혔습니다.'));waiter.current=null;}};
 },[edit]);
 const hasChanges=edit&&(dirty||name!==record.name);
 useEffect(()=>{
  if(!hasChanges)return;
  const before=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
  const leave=(e:MouseEvent)=>{const a=(e.target as HTMLElement).closest('a');if(a?.href&&a.href!==location.href&&!window.confirm('저장하지 않은 변경이 있습니다. 페이지를 나가시겠습니까?')){e.preventDefault();e.stopPropagation();}};
  window.addEventListener('beforeunload',before);document.addEventListener('click',leave,true);
  return()=>{window.removeEventListener('beforeunload',before);document.removeEventListener('click',leave,true);};
 },[hasChanges]);
 function snapshot(){return new Promise<StudioState>((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>{waiter.current=null;reject(Error('편집 화면 응답을 확인하지 못했습니다. 화면의 작업은 유지됩니다. 다시 저장하세요.'));},8000);waiter.current={id,resolve,reject,timer};send({type:'snapshot',requestId:id});});}
 async function save(copy=false){
  if(busy.current||!ready||!name.trim())return;busy.current=true;setPending(true);setError('');setSaved(null);send({type:'lock',locked:true});
  try{
   const state=await snapshot();const key=JSON.stringify([name.trim(),studioKey(state),copy]);
   if(request.current?.key!==key)request.current=null;
   if(!request.current){
    const outgoing=structuredClone(state);
    for(const d of outgoing.designs){
     if(d.art!=='upload'||d.asset_id)continue;
     if(!(d.sourceBlob instanceof Blob))throw Error('나염 이미지가 없습니다. 이미지를 다시 선택하세요.');
     if(d.sourceBlob.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(d.sourceBlob.type))throw Error('나염은 2MiB 이하 PNG·JPEG·WebP 파일을 선택하세요.');
     const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await d.sourceBlob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
     let upload=uploads.current.get(d.id);
     if(!upload||upload.hash!==hash){upload={hash,request_id:crypto.randomUUID()};uploads.current.set(d.id,upload);}
     if(!upload.asset)upload.asset=await designRequest<AssetMeta>(`/${recordRef.current.id}/assets`,{request_id:upload.request_id,data_url:await readFile(new File([d.sourceBlob],'artwork',{type:d.sourceBlob.type}))});
     d.asset_id=upload.asset.id;
    }
    request.current={key,path:copy?`/${recordRef.current.id}/copies`:`/${recordRef.current.id}`,method:copy?'POST':'PATCH',body:{request_id:crypto.randomUUID(),name:copy?`${name.trim().slice(0,113)} 사본`:name.trim(),document:studioDocument(outgoing,recordRef.current.document.gloss),...(copy?{}:{base_version:recordRef.current.version})}};
   }
   const result=await designRequest<DesignRecord>(request.current.path,request.current.body,request.current.method);
   rememberDesignSave(result);recordRef.current=result;setRecord(result);setName(result.name);draft.current=result.document.studio!;setDirty(false);setSaved(result);setConflict(false);request.current=null;uploads.current.clear();
   send({type:'saved',studio:result.document.studio,assets:assetUrls(result)});
   if(copy)window.history.replaceState(null,'',`/admin/designs/${result.id}/edit`);
  }catch(e){setError(errorMessage(e));setConflict(e instanceof DesignError&&e.status===409);}
  finally{busy.current=false;setPending(false);send({type:'lock',locked:false});}
 }
 async function reload(){
  if(busy.current||!window.confirm('현재 변경을 버리고 서버의 최신 저장본을 불러오시겠습니까?'))return;
  busy.current=true;setPending(true);send({type:'lock',locked:true});
  try{
   const result=await designRequest<DesignRecord>(`/${recordRef.current.id}`);
   await new Promise<void>((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>{initWaiter.current=null;send({type:'cancel-init',requestId:id});reject(Error('미리보기 불러오기 응답을 확인하지 못했습니다.'));},20000);initWaiter.current={id,resolve,reject,timer};send({type:'init',requestId:id,studio:result.document.studio,assets:assetUrls(result),readonly:false});});
   recordRef.current=result;setRecord(result);setName(result.name);draft.current=result.document.studio!;request.current=null;uploads.current.clear();setSaved(null);setError('');setConflict(false);setDirty(false);setReady(true);
  }
  catch(e){setError(`최신 조회 실패. 현재 작업은 유지됩니다. ${errorMessage(e)}`);}
  finally{busy.current=false;setPending(false);send({type:'lock',locked:false});}
 }
 return <DesignShell title={edit?'의류 디자인 편집':record.name} description={edit?'옷을 회전하며 원단과 나염을 조합하세요. 완료 후 서버에 저장합니다.':'저장된 의류 디자인 · 회전하여 앞뒤와 안쪽을 확인하세요.'} actions={<><Link className="text-link" href="/admin/designs">목록으로</Link>{edit?<Link className="text-link" href={`/admin/designs/${record.id}`}>저장된 상세</Link>:<Link className="button" href={`/admin/designs/${record.id}/edit`}>디자인 편집</Link>}</>}>
 {saved&&<SaveResult key={`${saved.id}-${saved.version}`} title={`${saved.name} 디자인을 저장했습니다`} actions={<><Link className="button" href={`/admin/designs/${saved.id}`}>저장된 상세 보기</Link><button onClick={()=>{setSaved(null);document.getElementById('studio-name')?.focus();}}>계속 편집</button><Link className="text-link" href="/admin/designs">목록으로</Link></>}><KeyFacts label="서버 저장 확정" items={[{label:'저장 버전',value:`v${saved.version}`},{label:'나염',value:`${saved.document.studio?.designs.length??0}개`}]}/><p>앞뒤 배치·크기·회전과 의류·원단 설정이 저장되었습니다.</p></SaveResult>}
 {edit?<div className="designer-editor-top"><label>디자인 이름<input id="studio-name" value={name} maxLength={120} disabled={pending} onChange={e=>{setName(e.target.value);request.current=null;setSaved(null);}}/></label><p role="status">{hasChanges?'● 저장하지 않은 변경':`✓ 저장 버전 ${record.version}`}</p></div>:<KeyFacts label="저장된 디자인" items={[{label:'저장 버전',value:`v${record.version}`},{label:'수정 일시',value:new Date(record.updated_at).toLocaleString('ko-KR')}]}/>}
 {!ready&&!error&&<p role="status">의류와 원단을 준비하고 있습니다…</p>}
 <iframe className="designer-studio-frame" ref={frame} src="/garment-studio/index.html" title={edit?'실시간 의류 디자인 편집':'저장된 의류 디자인 미리보기'} />
 {error&&<div role="alert" className="designer-error"><p>{error}</p><p>현재 입력과 나염은 유지됩니다. 저장 성공 전에는 페이지를 닫지 마세요.</p></div>}
 {conflict&&<div className="designer-conflict"><h2>다른 저장 버전과 충돌했습니다</h2><p>현재 변경을 새 디자인으로 보존하거나 최신 저장본을 불러오세요.</p><div className="designer-actions"><button disabled={pending} onClick={()=>void save(true)}>현재 변경을 새 디자인으로 저장</button><button disabled={pending} onClick={()=>void reload()}>최신 저장본 불러오기</button></div></div>}
 {edit&&<footer className="designer-savebar"><div><strong>{pending?'서버에 저장 중…':hasChanges?'변경 내용을 저장하세요':'저장된 상태입니다'}</strong><p className="designer-caption">저장한 작업은 다시 불러올 수 있습니다. 상품·가격·재고는 변경되지 않습니다.</p></div><button className="button" disabled={pending||!ready||!name.trim()||conflict||(!hasChanges&&!error)} onClick={()=>void save()}>{pending?'저장 중…':error?'같은 요청으로 다시 저장':'디자인 저장'}</button></footer>}
 </DesignShell>;
}
