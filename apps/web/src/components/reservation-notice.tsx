'use client';
import {useEffect,useState} from 'react';
import {reservationSeconds,type Reservation} from '@/lib/sales-orders';

export function ReservationNotice({reservation,checkingPayment,orderStatus,onExpire,onReload}:{
 reservation:Reservation;checkingPayment:boolean;orderStatus:string;onExpire:(expiry:string)=>void;onReload:()=>void;
}){
 const [seconds,setSeconds]=useState(()=>reservationSeconds(reservation,0));
 useEffect(()=>{
  if(reservation.status!=='held'||checkingPayment)return;
  const receivedAt=performance.now();
  function tick(){
   const remaining=reservationSeconds(reservation,performance.now()-receivedAt);
   setSeconds(remaining);
   if(!remaining){window.clearInterval(timer);onExpire(reservation.expires_at);}
  }
  const timer=window.setInterval(tick,1000);
  tick();
  document.addEventListener('visibilitychange',tick);
  return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
 },[reservation,checkingPayment,orderStatus,onExpire]);
 return <div className="sales-reservation">
  {reservation.status==='released'?<p role="status"><strong>{reservation.release_reason==='customer_cancelled'?'고객 요청으로 주문이 취소되었습니다.':reservation.release_reason==='expired'||orderStatus==='expired'?'재고 확보 시간이 끝났습니다.':'재고 확보가 해제되었습니다.'}</strong> {reservation.release_reason==='customer_cancelled'||reservation.release_reason==='expired'||orderStatus==='expired'?'이 주문에 확보했던 재고가 해제되었어요.':''}</p>
   :checkingPayment?<p role="status"><strong>결제 결과를 확인하고 있어요.</strong> 확인이 끝날 때까지 상품을 확보합니다. 다시 결제하지 말고 주문 상태를 확인해 주세요.</p>
   :seconds>0?<><p><strong>재고 확보 남은 시간 <span role="timer">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span></strong></p><p className="sales-muted">이 시간 안에 결제가 승인되면 구매가 확정됩니다.</p></>
   :<><p role="status">재고 확보 시간이 지났습니다. 주문 상태를 다시 확인해 주세요.</p><button type="button" className="sales-action" onClick={onReload}>상태 다시 확인</button></>}
 </div>;
}
