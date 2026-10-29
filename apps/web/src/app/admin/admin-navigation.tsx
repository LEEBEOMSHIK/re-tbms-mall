'use client';
import Link from 'next/link';
import { adminSection } from '@/lib/admin-navigation';
import { SiteSettingsButton } from '@/components/site-settings';
import { SiteSettingsContent } from '@/components/site-settings-content';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
export function AdminNavigation(){
  const path=usePathname();const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function logout(){setBusy(true);setError('');try{const response=await fetch('/api/admin/session',{method:'DELETE',credentials:'same-origin',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error();router.replace('/admin/login');router.refresh();}catch{setError('로그아웃하지 못했습니다. 다시 시도해 주세요.');setBusy(false);}}
  return <header className="admin-shell-header"><div className="admin-shell-inner"><Link className="wordmark" href="/admin">RE: TBMS<span>ADMINISTRATION</span></Link><nav aria-label="관리자 메뉴">{[['/admin','관리자 홈'],['/admin/catalog','상품 관리'],['/admin/catalog/inventory','재고 관리'],['/admin/factories','공장 협업'],['/admin/designs','의류 디자인'],['/admin/merchandising','진열 관리'],['/admin/reviews','리뷰 관리'],['/admin/workboard','작업 보드']].map(([href,label])=><Link key={href} href={href} aria-current={adminSection(path)===href?'page':undefined}>{label}</Link>)}</nav><div className="admin-account"><SiteSettingsButton><SiteSettingsContent /></SiteSettingsButton><Link href="/">쇼핑몰 보기 ↗</Link><button disabled={busy} onClick={()=>void logout()}>{busy?'로그아웃 중…':'로그아웃'}</button></div></div>{error&&<p role="alert" className="admin-session-error">{error}</p>}</header>;
}
