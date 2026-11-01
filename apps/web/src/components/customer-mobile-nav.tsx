'use client';
import {CustomerSession} from './customer-session';
import {CustomerCartLink} from './customer-cart-link';
import {useEffect,useId,useRef,type ReactNode} from 'react';

export function CustomerMobileNav({children}:{children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const title=useId();
 useEffect(()=>{const media=window.matchMedia('(min-width: 768px)');const close=()=>{if(media.matches){dialog.current?.querySelectorAll<HTMLDialogElement>("dialog[open]").forEach(child=>child.close());dialog.current?.close()}};media.addEventListener('change',close);return()=>media.removeEventListener('change',close)},[]);
 return <div className="customer-mobile-tools">
  <div className="customer-mobile-account"><CustomerSession showCart={false}/></div>
  <CustomerCartLink/>
  <button ref={trigger} type="button" className="customer-menu-trigger" aria-label="메뉴 열기" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5"/></svg></button>
  <dialog ref={dialog} className="customer-menu-dialog" aria-labelledby={title} onClose={()=>{if(trigger.current?.getClientRects().length)trigger.current.focus()}} onClick={event=>{if((event.target as HTMLElement).closest('a'))dialog.current?.close();if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.current?.close()}}}>
   <div className="customer-menu-heading"><h2 id={title}>메뉴</h2><button type="button" aria-label="메뉴 닫기" autoFocus onClick={()=>dialog.current?.close()}>닫기 <span aria-hidden="true">×</span></button></div>
   <nav aria-label="모바일 주요 메뉴">{children}</nav>
  </dialog>
 </div>
}
