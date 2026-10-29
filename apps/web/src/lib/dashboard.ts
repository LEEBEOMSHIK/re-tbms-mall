import {adminAuthFetch} from './admin-auth-fetch.ts';
export type DashboardTask = { id:string; title:string; priority:'high'|'normal'; area:'qna'|'inbound'|'shipping'|'inventory'; due_label:string };
export type Qna = { id:string; subject:string; product:string; status:'unanswered'|'answered'; received_at:string };
export type Inbound = { id:string; product:string; sku:string; quantity:number; status:'expected'|'inspection'|'received'; expected_date:string };
export type Shipment = { id:string; order_label:string; status:'preparing'|'in_transit'|'delayed'|'delivered'; item_count:number; updated_at:string };
export type Inventory = { id:string; product:string; sku:string; on_hand:number; reserved:number; available:number; reorder_point:number };
export type Dashboard = { mode:'sample'; as_of:string; tasks:DashboardTask[]; qna:Qna[]; inbound:Inbound[]; shipments:Shipment[]; inventory:Inventory[]; summary:{open_tasks:number;unanswered_qna:number;inbound_pending:number;shipping_delayed:number;low_stock_skus:number} };
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid dashboard');return value as Record<string,unknown>;}
function text(value:unknown):string{if(typeof value!=='string'||!value.trim()||value.length>1000)throw Error('Invalid dashboard text');return value;}
function count(value:unknown):number{if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('Invalid dashboard count');return Number(value);}
function choice<T extends string>(value:unknown,choices:readonly T[]):T{if(!choices.includes(value as T))throw Error('Invalid dashboard state');return value as T;}
function date(value:unknown):string{const result=text(value);if(!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(result)||!Number.isFinite(Date.parse(result)))throw Error('Invalid dashboard date');return result;}
function list<T extends {id:string}>(value:unknown,parse:(r:Record<string,unknown>)=>T):T[]{if(!Array.isArray(value)||value.length>1000)throw Error('Invalid dashboard list');const result=value.map(v=>parse(record(v)));if(new Set(result.map(r=>r.id)).size!==result.length)throw Error('Duplicate dashboard ID');return result;}
export function parseDashboard(value:unknown):Dashboard{
  const r=record(value),s=record(r.summary);
  return {mode:choice(r.mode,['sample']),as_of:date(r.as_of),
    tasks:list(r.tasks,t=>({id:text(t.id),title:text(t.title),priority:choice(t.priority,['high','normal']),area:choice(t.area,['qna','inbound','shipping','inventory']),due_label:text(t.due_label)})),
    qna:list(r.qna,q=>({id:text(q.id),subject:text(q.subject),product:text(q.product),status:choice(q.status,['unanswered','answered']),received_at:date(q.received_at)})),
    inbound:list(r.inbound,i=>({id:text(i.id),product:text(i.product),sku:text(i.sku),quantity:count(i.quantity),status:choice(i.status,['expected','inspection','received']),expected_date:date(i.expected_date)})),
    shipments:list(r.shipments,i=>({id:text(i.id),order_label:text(i.order_label),status:choice(i.status,['preparing','in_transit','delayed','delivered']),item_count:count(i.item_count),updated_at:date(i.updated_at)})),
    inventory:list(r.inventory,i=>({id:text(i.id),product:text(i.product),sku:text(i.sku),on_hand:count(i.on_hand),reserved:count(i.reserved),available:count(i.available),reorder_point:count(i.reorder_point)})),
    summary:{open_tasks:count(s.open_tasks),unanswered_qna:count(s.unanswered_qna),inbound_pending:count(s.inbound_pending),shipping_delayed:count(s.shipping_delayed),low_stock_skus:count(s.low_stock_skus)}};
}
export function filterQna(items:Qna[],filter:'all'|'unanswered'){return filter==='all'?items:items.filter(item=>item.status==='unanswered');}
export function filterInventory(items:Inventory[],filter:'all'|'low'){return filter==='all'?items:items.filter(item=>item.available<=item.reorder_point);}
export async function requestDashboard(options:{signal?:AbortSignal;fetcher?:typeof fetch}={}):Promise<{ok:true;data:Dashboard}|{ok:false;reason:'auth'|'unavailable'}>{
  try{const r=await(options.fetcher||adminAuthFetch)('/api/admin/dashboard',{cache:'no-store',credentials:'same-origin',signal:options.signal||AbortSignal.timeout(12000)});if(!r.ok)return{ok:false,reason:r.status===401?'auth':'unavailable'};return{ok:true,data:parseDashboard(await r.json())};}catch{return{ok:false,reason:'unavailable'};}
}
export function dashboardDate(value:string){return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
