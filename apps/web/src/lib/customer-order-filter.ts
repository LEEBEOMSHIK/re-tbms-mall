export const customerOrderStates=[
 {value:'',label:'전체 상태'},
 {value:'pending',label:'결제 대기'}, {value:'unknown',label:'결제 확인 중'},
 {value:'paid',label:'결제 완료'}, {value:'preparing',label:'상품 준비 중'},
 {value:'partially_shipped',label:'일부 발송'}, {value:'shipped',label:'배송 중'},
 {value:'delivered',label:'배송 완료'}, {value:'closed',label:'처리 완료'},
 {value:'cancelled',label:'주문 취소'}, {value:'expired',label:'결제 기한 만료'},
 {value:'failed',label:'결제 실패'},
];
export function customerOrderFilter(state:string,months:string,now=new Date()):Record<string,string>{
 const q:Record<string,string>={};
 if(['closed','cancelled','expired'].includes(state))q.status=state;
 else if(['pending','unknown','failed'].includes(state)){q.status='awaiting_payment';q.payment_status=state;}
 else if(['paid','preparing','partially_shipped','shipped','delivered'].includes(state)){
  q.status='confirmed';q.payment_status='succeeded';q.fulfillment_status=state==='paid'?'unprepared':state;
 }
 if(['1','3','6','12'].includes(months)){
  const today=new Date(now.getTime()+9*60*60*1000);
  q.date_to=today.toISOString().slice(0,10);
  const start=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()-Number(months),1));
  const last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
  start.setUTCDate(Math.min(today.getUTCDate(),last));
  q.date_from=start.toISOString().slice(0,10);
 }
 return q;
}
