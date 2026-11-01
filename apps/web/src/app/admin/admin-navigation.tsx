'use client';
import {BrandLogo} from '@/components/brand-logo';

import Link from 'next/link';
import { adminSection } from '@/lib/admin-navigation';
import { DEFAULT_ADMIN_MENU, MENU_ITEMS, parseAdminMenu, type AdminMenuGroup, type AdminMenuState } from '@/lib/admin-menu';
import { SiteSettingsButton } from '@/components/site-settings';
import { SiteSettingsContent } from '@/components/site-settings-content';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

function MenuGroup({group,path,onNavigate}:{group:AdminMenuGroup;path:string;onNavigate:()=>void}) {
  const [expanded,setExpanded]=useState(true);
  const items=group.items.filter(item=>item.visible);
  if(!group.visible||!items.length)return null;
  return <section className="admin-nav-group"><button type="button" className="admin-nav-group-toggle" aria-expanded={expanded} aria-controls={`admin-group-${group.id}`} onClick={()=>setExpanded(!expanded)}><span>{group.label}</span><svg viewBox="0 0 20 20" aria-hidden="true" className={expanded?'is-open':''}><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></button><div id={`admin-group-${group.id}`} hidden={!expanded}>{items.map(item=>{const menu=MENU_ITEMS.find(menu=>menu.id===item.id)!;return <Link key={item.id} href={menu.href} onClick={onNavigate} aria-current={adminSection(path)===menu.href?'page':undefined}>{menu.label}</Link>})}</div></section>;
}
export function AdminNavigation(){
  const path=usePathname();const router=useRouter();const [busy,setBusy]=useState(false);const [menuOpen,setMenuOpen]=useState(false);const [error,setError]=useState('');
  const [config,setConfig]=useState<AdminMenuState>(DEFAULT_ADMIN_MENU);const [configError,setConfigError]=useState('');const [retry,setRetry]=useState(0);const [loaded,setLoaded]=useState(false);const mobileToggle=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const controller=new AbortController();let active=true;let savedDuringRequest=false;
    function updated(event:Event){try{const state=parseAdminMenu((event as CustomEvent).detail);savedDuringRequest=true;setConfig(state);setLoaded(true);setConfigError('');}catch{/* Ignore events that do not match the server contract. */}}
    window.addEventListener('admin-navigation-updated',updated);
    void fetch('/api/admin/navigation',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])}).then(async response=>{if(!response.ok)throw Error();return parseAdminMenu(await response.json());}).then(state=>{if(active&&!savedDuringRequest){setConfig(state);setLoaded(true);setConfigError('');}}).catch(()=>{if(active&&!savedDuringRequest)setConfigError('메뉴 설정을 불러오지 못했습니다.');});
    return()=>{active=false;controller.abort();window.removeEventListener('admin-navigation-updated',updated);};
  },[path,retry]);
  function closeMenu(){setMenuOpen(false);if(menuOpen)mobileToggle.current?.focus();}
  async function logout(){setBusy(true);setError('');try{const response=await fetch('/api/admin/session',{method:'DELETE',credentials:'same-origin',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();router.replace('/admin/login');router.refresh();}catch{setError('로그아웃하지 못했습니다. 다시 시도해 주세요.');setBusy(false);}}
  return <aside className="admin-sidebar" aria-label="관리자 작업 공간" onKeyDown={event=>{if(event.key==='Escape'&&menuOpen&&!(event.target instanceof Element&&event.target.closest('dialog'))){event.preventDefault();closeMenu();}}}>
    <div className="admin-sidebar-brand"><Link className="wordmark" href="/admin" aria-label="RE:TAG 관리자 홈"><BrandLogo/><span>ADMINISTRATION</span></Link><button ref={mobileToggle} type="button" className="admin-menu-toggle" aria-expanded={menuOpen} aria-controls="admin-sidebar-menu" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?'메뉴 닫기':'메뉴 열기'}</button></div>
    <div id="admin-sidebar-menu" className={`admin-sidebar-menu${menuOpen?' is-open':''}`}>
      <section className="admin-identity" aria-label="관리자 계정"><span className="admin-identity-icon" aria-hidden="true">A</span><div><strong>관리자</strong><p>관리자 세션</p></div><SiteSettingsButton><SiteSettingsContent /></SiteSettingsButton></section>
      {configError&&<div className="admin-nav-notice" role="status"><p>{configError} {loaded?'마지막으로 확인한 메뉴를 표시합니다.':'기본 메뉴를 표시합니다.'}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>메뉴 다시 불러오기</button></div>}
      <nav aria-label="관리자 메뉴">{config.groups.map(group=><MenuGroup key={`${group.id}:${path}`} group={group} path={path} onNavigate={closeMenu}/>)}</nav>
      <div className="admin-sidebar-actions"><Link href="/admin/guide" aria-current={path==='/admin/guide'?'page':undefined} onClick={closeMenu}>사용 가이드</Link><Link href="/admin/navigation" aria-current={path==='/admin/navigation'||path.startsWith('/admin/navigation/')?'page':undefined} onClick={closeMenu}>메뉴 관리</Link><Link href="/">쇼핑몰 보기 ↗</Link><button disabled={busy} onClick={()=>void logout()}>{busy?'로그아웃 중…':'로그아웃'}</button></div>
      {error&&<p role="alert" className="admin-session-error">{error}</p>}
    </div>
  </aside>;
}
