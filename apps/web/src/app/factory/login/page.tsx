import {BrandLogo} from '@/components/brand-logo';
import {LoginNavigation} from '@/components/ui/login-navigation';
import {SiteSettingsButton} from '@/components/site-settings';
import {SiteSettingsContent} from '@/components/site-settings-content';
import './login.css';
import {redirect} from 'next/navigation';
import {getFactorySession} from '@/lib/factory-session';
import {FactoryLogin} from '../factory-login';
export const dynamic='force-dynamic';
export default async function Page(){if(await getFactorySession())redirect('/factory');return <main id="main" className="factory-page factory-login ds-login-page"><BrandLogo/><p className="eyebrow">RE:TAG / FACTORY</p><div className="ds-login-heading"><h1>공장 로그인</h1><SiteSettingsButton><SiteSettingsContent/></SiteSettingsButton></div><p className="ds-login-intro">전달받은 공장 계정으로 담당 상품과 제작 요청을 확인합니다.</p><FactoryLogin allowTestLogin={process.env.NODE_ENV==='development'}/><LoginNavigation role="factory"/></main>;}
