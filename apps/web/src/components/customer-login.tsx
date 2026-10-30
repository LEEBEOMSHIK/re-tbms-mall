'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {customerRequest,parseProviders,safeCustomerReturn} from '@/lib/customer-shopping';
import './customer-shopping.css';

export function CustomerLogin(){
 const params=useSearchParams(), returnTo=safeCustomerReturn(params.get('return_to')??'/cart');
 const [providers,setProviders]=useState<ReturnType<typeof parseProviders>|null>(null);
 const [error,setError]=useState(false),[checking,setChecking]=useState(false);
 const [busy,setBusy]=useState<'google'|'kakao'|null>(null);
 const submitting=useRef(false);
 async function load(){setChecking(true);setError(false);const r=await customerRequest('/providers',parseProviders);if(r.ok)setProviders(r.data);else setError(true);setChecking(false)}
 useEffect(()=>{let active=true;void customerRequest('/providers',parseProviders).then(r=>{if(!active)return;if(r.ok)setProviders(r.data);else setError(true)});return()=>{active=false}},[]);
 useEffect(()=>{const restore=()=>{submitting.current=false;setBusy(null)};window.addEventListener('pageshow',restore);return()=>window.removeEventListener('pageshow',restore)},[]);
 const needsRetry=error||(providers!==null&&(['google','kakao'] as const).some(id=>!providers.some(p=>p.id===id&&p.enabled)));
 return <section className="customer-shopping customer-login" aria-labelledby="customer-login-title">
  <div className="customer-login-card">
   <header className="customer-login-heading">
    <p className="customer-login-brand">RE: TBMS<span>EVERYDAY WARDROBE</span></p>
    <h1 id="customer-login-title">반가워요</h1>
    <p>로그인하고 마음에 드는 옷을<br/>나만의 장바구니에 담아보세요.</p>
   </header>
   {params.has('error')&&<div className="customer-login-notice" role="alert"><strong>로그인을 완료하지 못했어요</strong><p>취소했거나 연결에 문제가 있을 수 있어요. 아래에서 다시 시도해 주세요.</p></div>}
   {error?<div className="customer-login-notice" role="alert">로그인 방법을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</div>:!providers?<p className="customer-login-status" role="status">로그인 방법을 확인하고 있어요.</p>:<div className="customer-providers" aria-label="소셜 로그인">
    {(['google','kakao'] as const).map(id=>{const enabled=providers.some(p=>p.id===id&&p.enabled);return <form key={id} action={`/api/customer/oauth/${id}/start`} method="post" onSubmit={e=>{if(submitting.current){e.preventDefault();return}submitting.current=true;setBusy(id)}}>
     <input type="hidden" name="return_to" value={returnTo}/>
     <button className={`customer-provider customer-provider-${id}`} disabled={!enabled||busy!==null||checking} type="submit">
      {id==='google'?<Image src="/auth/google-g.png" width={20} height={20} alt="" unoptimized/>:<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 3C5.9 3 1 6.7 1 11.2c0 2.9 2 5.5 5 7L4.7 23l5.5-3.6c.6.1 1.2.1 1.8.1 6.1 0 11-3.7 11-8.3S18.1 3 12 3Z"/></svg>}
      <span>{id==='google'?'Google로 로그인':'카카오 로그인'}</span>
     </button>
     {!enabled&&<p className="customer-provider-unavailable">현재 연결 준비 중이에요.</p>}
    </form>})}
   </div>}
   {busy&&<p className="customer-login-status" role="status">{busy==='google'?'Google':'카카오'} 로그인 화면으로 연결하고 있어요…</p>}
   {needsRetry&&<button className="customer-secondary customer-login-retry" disabled={busy!==null||checking} onClick={()=>void load()}>{checking?'연결 확인 중…':'로그인 연결 다시 확인'}</button>}
   <p className="customer-login-help">별도의 비밀번호 없이 이용할 수 있어요.</p>
   <nav className="customer-login-policy" aria-label="로그인 관련 안내"><Link href="/policies/terms">이용약관</Link><span aria-hidden="true">·</span><Link href="/policies/privacy">개인정보처리방침</Link></nav>
  </div>
  <Link className="customer-login-back" href={returnTo==='/cart'?'/products':returnTo}><span aria-hidden="true">←</span> 로그인 없이 둘러보기</Link>
 </section>
}
