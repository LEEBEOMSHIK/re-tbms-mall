'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ADMIN_EXPIRED_EVENT} from '@/lib/admin-auth-fetch';
export function AdminSessionGuard({expiresAt,children}:{expiresAt:number;children:React.ReactNode}){
 const router=useRouter(),redirecting=useRef(false);const [expired,setExpired]=useState(false);
 useEffect(()=>{
  let active=true,checking=false;let timer:ReturnType<typeof setTimeout>;
  function schedule(deadline:number){if(!active)return;clearTimeout(timer);timer=setTimeout(()=>{void check();},Math.max(1000,Math.min(2147483647,deadline-Date.now())));}
  async function expire(){
   if(!active||redirecting.current)return;redirecting.current=true;setExpired(true);
   try{await fetch('/api/admin/session',{method:'DELETE',credentials:'same-origin',signal:AbortSignal.timeout(3000)});}catch{/* Login remains available during an outage. */}
   if(active){router.replace('/admin/login?reason=expired');router.refresh();}
  }
  async function check(){
   if(!active||checking||document.visibilityState==='hidden'||redirecting.current)return;
   checking=true;
   try{const response=await fetch('/api/admin/session',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(5000)});if(!active)return;if(response.ok){const session=await response.json();if(session.authenticated===false)void expire();else if(Number.isFinite(session.expiresAt))schedule(session.expiresAt);}else schedule(Date.now()+60000);}catch{schedule(Date.now()+60000);/* Connectivity failures are not expired sessions. */}finally{checking=false;}
  }
  const onExpired=()=>{void expire();};schedule(expiresAt);
  window.addEventListener(ADMIN_EXPIRED_EVENT,onExpired);window.addEventListener('focus',check);window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);void check();
  return()=>{active=false;clearTimeout(timer);window.removeEventListener(ADMIN_EXPIRED_EVENT,onExpired);window.removeEventListener('focus',check);window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',check);};
 },[expiresAt,router]);
 return expired?<main id="main"><p role="status">로그인이 만료되어 로그인 화면으로 이동합니다.</p></main>:children;
}
