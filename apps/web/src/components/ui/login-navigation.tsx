import Link from 'next/link';
import './login-navigation.css';
export function LoginNavigation({role}:{role:'admin'|'factory'}){
 return <nav className="ds-login-navigation" aria-label="다른 로그인 및 쇼핑몰 이동"><Link href={role==='admin'?'/factory/login':'/admin/login'}>{role==='admin'?'공장 관리자 로그인':'내부 관리자 로그인'}<span aria-hidden="true">›</span></Link><Link href="/">쇼핑몰로 돌아가기<span aria-hidden="true">›</span></Link></nav>;
}
