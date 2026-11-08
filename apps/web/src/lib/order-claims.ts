import {parseOrderDetail,type OrderDetail} from './sales-orders.ts';
import type {Shipping} from './customer-checkout.ts';

export const claimKinds={return:'반품',exchange:'교환'};
export const claimReasons={change_mind:'단순 변심',size_color:'사이즈·색상',defective:'상품 불량',wrong_item:'오배송'};
export const claimStatuses={requested:'접수됨',reviewing:'검토 중',collection_pending:'회수 대기',received:'회수 확인',inspected:'검수 완료',refund_pending:'환불 처리 대기',exchange_pending:'교환 출고 대기',conversion_requested:'반품 전환 동의 대기',rejected:'반려',withdrawn:'철회'};
export const claimActions={review:'검토 시작',approve_collection:'회수 안내',receive:'회수 확인',inspect:'검수 완료 기록',queue_refund:'환불 처리 대기',queue_exchange:'교환 출고 대기',reject:'반려',request_conversion:'반품 전환 요청',withdraw:'접수 철회',convert_return:'반품 전환 동의'};
export type ClaimAction=keyof typeof claimActions;
export type ClaimSummary={id:string;order_id:string;order_number:string;line_id:string;product_name:string;color:string;size:string;kind:keyof typeof claimKinds;status:keyof typeof claimStatuses;quantity:number;reason:keyof typeof claimReasons;version:number;created_at:string;updated_at:string};
export type ClaimDetail=ClaimSummary&{description:string;received_date:string;shipping:Shipping;target_sku_id:string|null;target_color:string|null;target_size:string|null;conversion_from:'reviewing'|'received'|'inspected'|null;photos:string[];events:{id:string;action:string;status:keyof typeof claimStatuses;note:string;actor:'customer'|'admin';at:string}[];customer_actions:ClaimAction[];admin_actions:ClaimAction[];session_guard?:string};
export type ClaimContext={order:OrderDetail;eligible:boolean;ineligibility_reason:string|null;lines:{line_id:string;remaining_quantity:number;exchange_options:{sku_id:string;color:string;size:string;available_quantity:number}[]}[];session_guard?:string};
export const claimUuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid claim');return v as Record<string,unknown>};
const str=(v:unknown,max=2000)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid claim text');return v};
const id=(v:unknown)=>{const value=str(v,36);if(!claimUuid.test(value))throw Error('Invalid claim identifier');return value};
const integer=(v:unknown,min=0)=>{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min)throw Error('Invalid claim quantity');return v};
const timestamp=(v:unknown)=>{const s=str(v,64);if(!Number.isFinite(Date.parse(s)))throw Error('Invalid claim timestamp');return s};
const state=<T extends Record<string,string>>(v:unknown,values:T):keyof T=>{if(typeof v!=='string'||!Object.hasOwn(values,v))throw Error('Invalid claim state');return v as keyof T};
const array=(v:unknown,max:number)=>{if(!Array.isArray(v)||v.length>max)throw Error('Invalid claim list');return v as unknown[]};
const session=(v:unknown)=>{if(v===undefined)return {};const guard=str(v,64);if(!/^[a-f0-9]{64}$/.test(guard))throw Error('Invalid session guard');return {session_guard:guard}};
export function parseClaimPhoto(v:unknown){
 const s=str(v,4*Math.ceil(2*1024*1024/3)+32),match=/^data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/]*={0,2})$/.exec(s);
 if(!match||!match[1]||match[1].length%4!==0||match[1].length/4*3-(match[1].endsWith('==')?2:match[1].endsWith('=')?1:0)>2*1024*1024)throw Error('Invalid claim photo');
 return s;
}
export function parseClaimSummary(raw:unknown):ClaimSummary{
 const v=obj(raw);return{id:id(v.id),order_id:id(v.order_id),order_number:str(v.order_number,100),line_id:id(v.line_id),product_name:str(v.product_name,300),color:str(v.color,100),size:str(v.size,100),kind:state(v.kind,claimKinds),status:state(v.status,claimStatuses),quantity:integer(v.quantity,1),reason:state(v.reason,claimReasons),version:integer(v.version,1),created_at:timestamp(v.created_at),updated_at:timestamp(v.updated_at)};
}
export function parseClaimDetail(raw:unknown):ClaimDetail{
 const v=obj(raw),s=obj(v.shipping),received=str(v.received_date,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(received)||!Number.isFinite(Date.parse(received)))throw Error('Invalid received date');
 return {...parseClaimSummary(v),...session(v.session_guard),description:str(v.description),received_date:received,shipping:{recipient:str(s.recipient,50),phone:str(s.phone,20),postal_code:str(s.postal_code,5),address:str(s.address,200),address_detail:str(s.address_detail,100),memo:str(s.memo,200)},target_sku_id:v.target_sku_id===null?null:str(v.target_sku_id,128),target_color:v.target_color===null?null:str(v.target_color,100),target_size:v.target_size===null?null:str(v.target_size,100),conversion_from:v.conversion_from===null?null:state(v.conversion_from,{reviewing:'',received:'',inspected:''}),photos:array(v.photos,3).map(parseClaimPhoto),events:array(v.events,1000).map(raw=>{const e=obj(raw);if(e.actor!=='customer'&&e.actor!=='admin')throw Error('Invalid claim actor');return{id:id(e.id),action:str(e.action,64),status:state(e.status,claimStatuses),note:str(e.note),actor:e.actor,at:timestamp(e.at)}}),customer_actions:array(v.customer_actions,2).map(v=>state(v,claimActions)),admin_actions:array(v.admin_actions,10).map(v=>state(v,claimActions))};
}
export function parseClaims(raw:unknown){const v=obj(raw);return {claims:array(v.claims,50).map(parseClaimSummary),next_cursor:v.next_cursor===null?null:str(v.next_cursor,512)}};
export function parseClaimContext(raw:unknown):ClaimContext{
 const v=obj(raw);if(typeof v.eligible!=='boolean')throw Error('Invalid claim eligibility');
 const order=parseOrderDetail(v.order),lines=array(v.lines,500).map(raw=>{const l=obj(raw);return{line_id:id(l.line_id),remaining_quantity:integer(l.remaining_quantity),exchange_options:array(l.exchange_options,500).map(raw=>{const s=obj(raw);return{sku_id:str(s.sku_id,128),color:str(s.color,100),size:str(s.size,100),available_quantity:integer(s.available_quantity)}})}});
 if(lines.some(l=>!order.lines.some(o=>o.id===l.line_id&&l.remaining_quantity<=o.quantity))||new Set(lines.map(l=>l.line_id)).size!==lines.length)throw Error('Invalid claim lines');
 return{order,eligible:v.eligible,ineligibility_reason:v.ineligibility_reason===null?null:str(v.ineligibility_reason),lines,...session(v.session_guard)};
}
