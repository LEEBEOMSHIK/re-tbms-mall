'use client';
import {useEffect, useRef} from 'react';

const MIN = 200, MAX = 360, DEFAULT = 240;
const storageKey = 'retag.admin.sidebar-width';
function clamp(value:number){return Math.max(MIN, Math.min(MAX, Math.round(value)));}

export function SidebarWidthControl(){
  const handle = useRef<HTMLDivElement>(null);
  const drag = useRef<{x:number;width:number}|null>(null);
  const width = useRef(DEFAULT);
  function apply(value:number){
    const next = clamp(value);
    handle.current?.closest<HTMLElement>('.admin-sidebar')?.style.setProperty('--sidebar-width',next+'px');
    width.current = next;
    handle.current?.setAttribute('aria-valuenow',String(next));
    handle.current?.setAttribute('aria-valuetext',next+'픽셀');
    return next;
  }
  function save(value:number){
    try{localStorage.setItem(storageKey,String(value));}catch{/* Width still applies to the current session. */}
  }
  useEffect(()=>{
    try{
      const value = localStorage.getItem(storageKey);
      if(value && /^\d{3}$/.test(value))apply(Number(value));
    }catch{/* Keep the default when browser storage is disabled. */}
  },[]);
  return <div ref={handle} className="sidebar-width-control" role="separator" tabIndex={0}
    aria-label="메뉴 너비 조절" aria-controls="admin-sidebar-menu" aria-orientation="vertical"
    aria-valuenow={DEFAULT} aria-valuemin={MIN} aria-valuemax={MAX} aria-valuetext={DEFAULT+'픽셀'}
    onPointerDown={e=>{
      if(!e.isPrimary || e.button!==0)return;
      drag.current={x:e.clientX,width:width.current};e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={e=>{if(drag.current && e.currentTarget.hasPointerCapture(e.pointerId))apply(drag.current.width+e.clientX-drag.current.x);}}
    onPointerUp={e=>{if(drag.current && e.currentTarget.hasPointerCapture(e.pointerId)){save(apply(drag.current.width+e.clientX-drag.current.x));drag.current=null;}}}
    onLostPointerCapture={()=>{if(drag.current){apply(drag.current.width);drag.current=null;}}}
    onDoubleClick={()=>save(apply(DEFAULT))}
    onKeyDown={e=>{
      const next = {ArrowLeft:width.current-16,ArrowRight:width.current+16,Home:MIN,End:MAX,Enter:DEFAULT}[e.key];
      if(next!==undefined){e.preventDefault();save(apply(next));}
    }}
  />;
}
