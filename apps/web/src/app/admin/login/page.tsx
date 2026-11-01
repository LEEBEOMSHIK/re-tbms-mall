import {BrandLogo} from '@/components/brand-logo';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { LoginForm } from './login-form';
import { SiteSettingsButton } from '@/components/site-settings';
import { SiteSettingsContent } from '@/components/site-settings-content';
export const dynamic='force-dynamic';
export default async function LoginPage({searchParams}:{searchParams:Promise<{reason?:string}>}){
  const expired=(await searchParams).reason==='expired';
  if(!expired&&await getAdminSession())redirect('/admin');
  return <main id="main" className="admin-login ds-login-page"><BrandLogo/><p className="eyebrow">RE:TAG / ADMIN</p><div className="admin-login-heading ds-login-heading"><h1>관리자 로그인</h1><SiteSettingsButton><SiteSettingsContent /></SiteSettingsButton></div><p className="admin-home-intro ds-login-intro">로그인 후 관리자 홈에서 각 메뉴로 이동합니다.</p>{expired&&<p role="status">로그인이 만료되었습니다. 다시 로그인해 주세요.</p>}<LoginForm allowTestLogin={process.env.NODE_ENV==='development'}/></main>;
}
