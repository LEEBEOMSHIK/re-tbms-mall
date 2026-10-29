import {adminAuthFetch} from './admin-auth-fetch.ts';
export type StockFilter = 'all' | 'low' | 'invalid';
export type InventoryOverview = {
  mode:'local'; as_of:string; total_on_hand:number; option_count:number; low_stock_count:number;
  low_stock_preview:Array<{id:string;product_id:string;product_name:string;internal_name:string;code:string;color:string;size:string;on_hand:number;reorder_point:number;is_active:boolean}>;
};
export function stockFilter(value:string|string[]|undefined):StockFilter {
  return value===undefined || value==='all' ? 'all' : value==='low' ? 'low' : 'invalid';
}
export function stockMatches(low:boolean,filter:StockFilter){return filter==='all'||(filter==='low'&&low);}
export function stockHref(filter:'all'|'low') {return `/admin/catalog/inventory?stock=${filter}`;}
export function parseInventoryOverview(value:unknown):InventoryOverview {
  function record(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid inventory overview');return v as Record<string,unknown>;}
  function count(v:unknown){if(!Number.isSafeInteger(v)||Number(v)<0)throw Error('Invalid count');return Number(v);}
  function text(v:unknown){if(typeof v!=='string'||!v.trim()||v.length>1000)throw Error('Invalid text');return v;}
  const r=record(value);
  if(r.mode!=='local'||typeof r.as_of!=='string'||!Number.isFinite(Date.parse(r.as_of)))throw Error('Invalid snapshot');
  if(!Array.isArray(r.low_stock_preview)||r.low_stock_preview.length>5)throw Error('Invalid preview');
  const rows=r.low_stock_preview.map(value=>{
    const p=record(value),on_hand=count(p.on_hand),reorder_point=count(p.reorder_point);
    if(on_hand>reorder_point||typeof p.is_active!=='boolean')throw Error('Invalid low stock');
    return {id:text(p.id),product_id:text(p.product_id),product_name:text(p.product_name),internal_name:text(p.internal_name),code:text(p.code),color:text(p.color),size:text(p.size),on_hand,reorder_point,is_active:p.is_active};
  });
  const option_count=count(r.option_count),low_stock_count=count(r.low_stock_count),total_on_hand=count(r.total_on_hand);
  if(low_stock_count>option_count||rows.length!==Math.min(5,low_stock_count)||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Inconsistent summary');
  if(option_count===0&&total_on_hand!==0)throw Error('Invalid empty stock');
  return {mode:'local',as_of:r.as_of,total_on_hand,option_count,low_stock_count,low_stock_preview:rows};
}
export async function requestInventoryOverview(options:{signal?:AbortSignal;fetcher?:typeof fetch}={}):Promise<{ok:true;data:InventoryOverview}|{ok:false;reason:'auth'|'unavailable'}>{
  try{
    const r=await(options.fetcher||adminAuthFetch)('/api/admin/inventory/overview',{cache:'no-store',credentials:'same-origin',signal:options.signal||AbortSignal.timeout(12000)});
    if(!r.ok)return {ok:false,reason:r.status===401?'auth':'unavailable'};
    return {ok:true,data:parseInventoryOverview(await r.json())};
  }catch{return {ok:false,reason:'unavailable'};}
}
