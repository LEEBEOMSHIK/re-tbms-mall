'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {parseOrderDetail,type OrderDetail} from '@/lib/sales-orders';
import {SaveResult} from './ui/save-result';

export function OrderCancellation({order,guard,onResult,onReload,children}:{
 children:ReactNode;order:OrderDetail;guard:string;onResult:(detail:OrderDetail)=>void;onReload:()=>void;
}){
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [finished,setFinished]=useState(false);
 const requestId=useRef(''),active=useRef<AbortController|null>(null);
 const storageKey='order-cancel:'+order.id+':'+guard;
 useEffect(()=>()=>{active.current?.abort();},[]);
 async function cancel(){
  if(active.current||!order.can_cancel||!guard)return;
  const controller=new AbortController();
  active.current=controller;setBusy(true);setError('');
  try{
   if(!requestId.current){
    try{requestId.current=sessionStorage.getItem(storageKey)||'';}catch{}
    if(!requestId.current)requestId.current=crypto.randomUUID();
    try{sessionStorage.setItem(storageKey,requestId.current);}catch{}
   }
   const response=await fetch('/api/customer/sales-orders/'+order.id+'/cancel',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]),
    headers:{'Content-Type':'application/json','X-Cart-Session':guard},body:JSON.stringify({request_id:requestId.current})
   });
   if(controller.signal.aborted)return;
   if(response.status===401||response.status===404){onReload();return;}
   if(response.status===409){
    setError('주문 또는 로그인 상태가 바뀌었어요. 최신 주문 상태를 확인해 주세요.');return;
   }
   if(!response.ok)throw Error();
   const raw=await response.json(),updated=parseOrderDetail(raw);
   if(controller.signal.aborted)return;
   if(updated.id!==order.id||raw.session_guard!==guard||!['cancelled','expired'].includes(updated.status))throw Error();
   try{sessionStorage.removeItem(storageKey);}catch{}
   setFinished(true);onResult(updated);
  }catch{
   if(!controller.signal.aborted)setError('취소 결과를 확인하지 못했어요. 주문 상태를 확인하거나 같은 요청으로 다시 시도해 주세요.');
  }finally{
   if(!controller.signal.aborted){active.current=null;setBusy(false);}
  }
 }
 if(finished&&['cancelled','expired'].includes(order.status))return <SaveResult
  status={order.status==='cancelled'?'취소 완료':'결제 기한 만료'} title={order.status==='cancelled'?'주문을 취소했습니다.':'취소 요청 전에 결제 기한이 만료됐어요.'}
  actions={<Link className="sales-action" href="/account/orders">주문 내역으로</Link>}>
  <p>주문번호 {order.number}</p><p>이 주문에 확보했던 재고가 해제되었습니다.</p>
 </SaveResult>;
 if(order.can_cancel!==true||!guard)return children;
 return <>{children}<div className="sales-cancel">
  {!confirm?<button type="button" className="sales-action" onClick={()=>setConfirm(true)}>주문 취소</button>:<>
   <h3>이 주문을 취소할까요?</h3><p>취소하면 확보한 재고가 해제됩니다. 취소한 주문은 되돌릴 수 없습니다.</p>
   {error&&<p role="alert">{error}</p>}
   <div className="sales-cancel-actions"><button type="button" className="sales-action" disabled={busy} onClick={cancel}>{busy?'취소 처리 중…':error?'같은 요청 다시 시도':'주문 취소 확정'}</button>
   {error?<button type="button" className="sales-action" onClick={onReload} disabled={busy}>최신 주문 상태 확인</button>:<button type="button" className="sales-action" disabled={busy} onClick={()=>setConfirm(false)}>주문 유지</button>}</div>
  </>}
 </div></>;
}
