import {orderLabel,orderTone,type SalesOrder} from '@/lib/sales-orders';
export function OrderStatusBadge({order}:{order:SalesOrder}){
 const tone=orderTone(order);
 return <span className={`sales-state sales-state-${tone}`}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 {tone==='success'?<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>:tone==='attention'?<><path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3h.01"/></>:tone==='stopped'?<><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></>:tone==='progress'&&order.fulfillment_status==='preparing'?<><path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7 5.8l9 5"/></>:tone==='progress'?<><path d="M3 7h11v11H3zM14 11h4l3 4v3h-7"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></>:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}
 </svg>{orderLabel(order)}</span>
}
