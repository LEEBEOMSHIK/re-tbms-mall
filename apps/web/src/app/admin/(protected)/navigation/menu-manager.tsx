'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { adminAuthFetch } from '@/lib/admin-auth-fetch';
import { DEFAULT_ADMIN_MENU, MENU_ITEMS, moveMenuItem, parseAdminMenu, visibleMenuCount, type AdminMenuGroup, type AdminMenuState, type MenuId } from '@/lib/admin-menu';
import { SaveResult } from '@/components/ui/save-result';
import { FormLabel, FormSelect } from '@/components/ui/form-controls';
import './menu-manager.css';

const ROOT='/admin/navigation';
const labelFor=(id:MenuId)=>MENU_ITEMS.find(item=>item.id===id)!.label;
async function request(body?:AdminMenuState,signal?:AbortSignal):Promise<AdminMenuState>{
  const response=await adminAuthFetch('/api/admin/navigation',{cache:'no-store',credentials:'same-origin',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),...(body?{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  if(!response.ok)throw Error(response.status===409?'conflict':response.status===401?'auth':[413,422].includes(response.status)?'invalid':'unknown');
  return parseAdminMenu(await response.json());
}
const message=(error:unknown)=>error instanceof Error&&error.message==='conflict'?'다른 창에서 메뉴 설정이 변경되었습니다. 입력은 유지됩니다. 최신 저장본을 확인해 주세요.':error instanceof Error&&error.message==='auth'?'관리자 로그인이 만료되었습니다. 다시 로그인해 주세요.':error instanceof Error&&error.message==='invalid'?'그룹 이름과 메뉴 배치를 확인해 주세요. 입력은 유지됩니다.':'서버 응답을 확인하지 못했습니다. 입력은 유지됩니다. 저장을 요청했다면 최신 저장본을 확인한 뒤 다시 시도해 주세요.';
function reorder<T>(items:T[],index:number,direction:-1|1):T[]{
  const target=index+direction;if(target<0||target>=items.length)return items;
  const next=[...items];[next[index],next[target]]=[next[target],next[index]];return next;
}

export function AdminMenuManager({mode}:{mode:'status'|'edit'}){
  const [saved,setSaved]=useState<AdminMenuState|null>(null);
  const [groups,setGroups]=useState<AdminMenuGroup[]>([]);
  const [latest,setLatest]=useState<AdminMenuState|null>(null);
  const [result,setResult]=useState<AdminMenuState|null>(null);
  const [busy,setBusy]=useState(true);
  const [blocked,setBlocked]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const lock=useRef(false);
  const groupAddButton=useRef<HTMLButtonElement>(null);
  const pendingFocus=useRef<string|null>(null);
  useEffect(()=>{
    if(!pendingFocus.current)return;
    const target=document.getElementById(pendingFocus.current);
    pendingFocus.current=null;
    target?.focus();
    if(target instanceof HTMLInputElement)target.select();
  },[groups]);
  useEffect(()=>{
    let active=true;const controller=new AbortController();lock.current=true;
    request(undefined,controller.signal).then(state=>{if(active){setSaved(state);setGroups(state.groups);}}).catch(error=>{if(active)setError(message(error));}).finally(()=>{if(active){lock.current=false;setBusy(false);}});
    return ()=>{active=false;controller.abort();lock.current=false;};
  },[]);
  async function load(recovery=false){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{const state=await request();if(recovery){setLatest(state);}else{setSaved(state);setGroups(state.groups);}}
    catch(error){setError(message(error));}finally{lock.current=false;setBusy(false);}
  }
  function change(next:AdminMenuGroup[]){setGroups(next);setResult(null);setNotice('');}
  function changeGroup(id:string,update:Partial<AdminMenuGroup>){change(groups.map(g=>g.id===id?{...g,...update}:g));}
  async function save(){
    if(!saved||lock.current||blocked)return;
    let body:AdminMenuState;try{body=parseAdminMenu({revision:saved.revision,groups});}catch{setError('그룹 이름은 공백을 제외한 1~40자로 입력해 주세요. 각 메뉴는 한 그룹에만 배치해야 합니다.');return;}
    lock.current=true;setBusy(true);setError('');setNotice('');setResult(null);
    try{const state=await request(body);setSaved(state);setGroups(state.groups);setLatest(null);setResult(state);window.dispatchEvent(new CustomEvent('admin-navigation-updated',{detail:state}));}
    catch(error){setError(message(error));if(!(error instanceof Error&&error.message==='invalid')){setBlocked(true);setLatest(null);}}
    finally{lock.current=false;setBusy(false);}
  }
  return <main id="main" className="admin-page menu-manager">
    <header className="menu-manager-heading"><div><p className="eyebrow">ADMIN NAVIGATION</p><h1>{mode==='edit'?'메뉴 구성 편집':'메뉴 관리'}</h1><p>관리자 메뉴의 그룹·순서·표시 여부를 관리합니다. 숨김은 접근 권한을 변경하지 않습니다.</p></div><Link className="text-link" href={mode==='edit'?ROOT:'/admin/site'}>{mode==='edit'?'메뉴 관리로':'사이트 관리로'}</Link></header>
    <p className="menu-manager-note">왼쪽의 ‘사용 가이드’·‘메뉴 관리’, 계정·설정·로그아웃은 항상 사용할 수 있습니다. 보이는 메뉴가 없는 그룹은 사이드바에 표시되지 않습니다.</p>
    {error&&<section className="menu-manager-error" role="alert"><p>{error}</p>{!saved&&<button disabled={busy} onClick={()=>void load()}>다시 불러오기</button>}</section>}
    {notice&&<p className="menu-manager-note" role="status">{notice}</p>}
    {!saved&&!error&&<p role="status">메뉴 설정을 불러오는 중입니다…</p>}
    {result&&<SaveResult key={result.revision} title="관리자 메뉴 구성을 저장했습니다." actions={<><Link className="button" href={ROOT}>저장된 구성 확인</Link><Link className="text-link" href="/admin">관리자 홈으로</Link></>}><p>확정 버전 {result.revision} · 그룹 {result.groups.length}개 · 표시 메뉴 {visibleMenuCount(result.groups)}개</p><p>저장된 구성이 왼쪽 메뉴에 반영되었습니다.</p></SaveResult>}
    {blocked&&<section className="menu-manager-recovery"><h2>최신 저장본 확인이 필요합니다</h2><p>현재 입력을 유지한 채 저장 결과와 버전을 확인합니다.</p><button disabled={busy} onClick={()=>void load(true)}>최신 저장본 확인 · 입력 유지</button></section>}
    {latest&&<section className="menu-manager-recovery"><h2>최신 저장 버전 {latest.revision}</h2><p>아래는 서버의 최신 구성입니다. 편집 중인 입력은 바뀌지 않았습니다.</p><details><summary>최신 저장 구성 보기</summary><MenuSummary state={latest}/></details><button disabled={busy} onClick={()=>{setSaved(latest);setLatest(null);setBlocked(false);setNotice('현재 입력을 최신 버전 기준으로 저장할 준비가 되었습니다. 아직 저장하지 않았습니다.');}}>현재 입력 유지하고 이 버전으로 저장 준비</button></section>}
    {saved&&mode==='status'&&<><div className="menu-manager-toolbar"><p>저장 버전 {saved.revision} · 그룹 {saved.groups.length}개 · 표시 메뉴 {visibleMenuCount(saved.groups)}개</p><Link className="button" href={`${ROOT}/edit`}>메뉴 구성 편집</Link></div><MenuSummary state={saved}/></>}
    {saved&&mode==='edit'&&<form className="ds-form menu-editor" onSubmit={event=>{event.preventDefault();void save();}}>
      <p className="menu-manager-note">편집 기준 버전 {saved.revision}. 변경 사항은 ‘메뉴 구성 저장’을 눌러야 반영됩니다.</p>
      <fieldset disabled={busy} className="menu-editor-fields"><legend className="sr-only">메뉴 그룹 구성</legend>
        {groups.map((group,index)=><section className="menu-editor-group" key={group.id} aria-labelledby={`menu-group-title-${group.id}`}>
          <div className="menu-group-heading"><h2 id={`menu-group-title-${group.id}`}>그룹 {index+1}</h2><div className="button-row"><button type="button" aria-label={`그룹 ${index+1} 위로`} disabled={index===0} onClick={()=>change(reorder(groups,index,-1))}>위로</button><button type="button" aria-label={`그룹 ${index+1} 아래로`} disabled={index===groups.length-1} onClick={()=>change(reorder(groups,index,1))}>아래로</button><button type="button" disabled={groups.length===1||group.items.length>0} title={group.items.length?'메뉴를 다른 그룹으로 옮긴 뒤 삭제할 수 있습니다.':undefined} onClick={()=>{change(groups.filter(g=>g.id!==group.id));groupAddButton.current?.focus();}}>빈 그룹 삭제</button></div></div>
          <div className="menu-group-fields"><div><FormLabel htmlFor={`menu-group-name-${group.id}`} required>그룹 이름</FormLabel><input id={`menu-group-name-${group.id}`} value={group.label} required maxLength={40} onChange={event=>changeGroup(group.id,{label:event.target.value})}/></div><label className="checkbox-label"><input type="checkbox" checked={group.visible} onChange={event=>changeGroup(group.id,{visible:event.target.checked})}/>그룹 표시</label></div>
          {!group.visible&&<p className="menu-manager-note">이 그룹의 모든 메뉴가 사이드바에서 숨겨집니다. 개별 메뉴 설정은 유지됩니다.</p>}
          <ul className="menu-edit-items">{group.items.map((item,itemIndex)=><li key={item.id}><div className="menu-item-label"><strong>{labelFor(item.id)}</strong><label className="checkbox-label"><input type="checkbox" checked={item.visible} onChange={event=>changeGroup(group.id,{items:group.items.map(i=>i.id===item.id?{...i,visible:event.target.checked}:i)})}/>메뉴 표시</label></div><div className="menu-item-controls"><div><FormLabel htmlFor={`menu-target-${item.id}`}>소속 그룹</FormLabel><FormSelect id={`menu-target-${item.id}`} value={group.id} options={groups.map((g,i)=>({value:g.id,label:g.label.trim()||`이름 없는 그룹 ${i+1}`}))} onChange={target=>{if(target===group.id)return;pendingFocus.current=`menu-target-${item.id}`;change(moveMenuItem(groups,item.id,target));}}/></div><div className="button-row"><button type="button" aria-label={`${labelFor(item.id)} 위로`} disabled={itemIndex===0} onClick={()=>changeGroup(group.id,{items:reorder(group.items,itemIndex,-1)})}>위로</button><button type="button" aria-label={`${labelFor(item.id)} 아래로`} disabled={itemIndex===group.items.length-1} onClick={()=>changeGroup(group.id,{items:reorder(group.items,itemIndex,1)})}>아래로</button></div></div></li>)}</ul>
          {!group.items.length&&<p className="menu-manager-note">빈 그룹입니다. 다른 메뉴의 ‘소속 그룹’에서 이 그룹으로 옮길 수 있습니다.</p>}
        </section>)}
        <div className="button-row"><button ref={groupAddButton} type="button" disabled={groups.length>=8} onClick={()=>{const id=crypto.randomUUID();pendingFocus.current=`menu-group-name-${id}`;change([...groups,{id,label:'새 그룹',visible:true,items:[]}]);}}>그룹 추가 ({groups.length}/8)</button><button type="button" onClick={()=>{change(structuredClone(DEFAULT_ADMIN_MENU.groups));setNotice('기본 구성을 입력에 불러왔습니다. 저장 전까지 현재 메뉴는 바뀌지 않습니다.');}}>기본 구성 불러오기</button><button className="button" type="submit" disabled={blocked}>{busy?'처리 중…':'메뉴 구성 저장'}</button></div>
      </fieldset>
    </form>}
  </main>;
}
function MenuSummary({state}:{state:AdminMenuState}){
  return <div className="menu-state-groups">{state.groups.map(group=><section key={group.id}><h2>{group.label} <span>{group.visible?'그룹 표시':'그룹 숨김'}</span></h2><ul>{group.items.map(item=><li key={item.id}><span>{labelFor(item.id)}</span><span>{group.visible&&item.visible?'표시':!group.visible?'그룹 숨김 적용':'숨김'}</span></li>)}</ul>{!group.items.length&&<p>메뉴 없음 · 사이드바에 표시되지 않습니다.</p>}</section>)}</div>;
}
