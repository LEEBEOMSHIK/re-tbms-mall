import {emptyShipping,type Shipping} from './customer-checkout.ts';
type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'|'key'|'length'>;
const prefix='checkout-input:';
export function clearCheckoutInputs(storage:StorageLike){
 try{for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith(prefix))storage.removeItem(key)}}catch{/* Storage may be unavailable. */}
}
export function readCheckoutInput(storage:StorageLike,id:string,guard?:string):Shipping|null{
 try{
  const raw=storage.getItem(prefix+id);if(!raw)return null;
  const value=JSON.parse(raw);
  if(!guard||value.guard!==guard)throw Error('Changed session');
  const shipping={...emptyShipping};
  for(const key of Object.keys(shipping) as (keyof Shipping)[]){if(typeof value.shipping?.[key]!=='string'||value.shipping[key].length>200)throw Error('Invalid input');shipping[key]=value.shipping[key]}
  return shipping;
 }catch{try{storage.removeItem(prefix+id)}catch{}return null}
}
export function writeCheckoutInput(storage:StorageLike,id:string,guard:string|undefined,shipping:Shipping){
 try{if(guard)storage.setItem(prefix+id,JSON.stringify({guard,shipping}))}catch{/* Keep the current React input state. */}
}
