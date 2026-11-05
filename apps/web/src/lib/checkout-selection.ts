import type {Cart} from './customer-shopping.ts';

export type CheckoutQuery = Record<string,string|string[]|undefined>;
export type CheckoutEntry =
 | {kind:'cart'}
 | {kind:'direct';sku:string;quantity:number}
 | {kind:'selected';skuIds:string[];version:number}
 | {kind:'invalid'};

export const isCartSku = (value:unknown): value is string =>
 typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
export function validSkuSelection(value:unknown): value is string[] {
 return Array.isArray(value) && value.length >= 1 && value.length <= 100 &&
  value.every(isCartSku) && new Set(value).size === value.length;
}

export function parseCheckoutEntry(query:CheckoutQuery):CheckoutEntry {
 const {sku_id,cart_version,sku,quantity} = query;
 if (Object.keys(query).some(key=>!['sku_id','cart_version','sku','quantity'].includes(key))) return {kind:'invalid'};
 if (sku_id !== undefined || cart_version !== undefined) {
  const skuIds = typeof sku_id === 'string' ? [sku_id] : sku_id;
  if (sku !== undefined || quantity !== undefined || !validSkuSelection(skuIds) ||
      typeof cart_version !== 'string' || !/^(0|[1-9]\d*)$/.test(cart_version) ||
      !Number.isSafeInteger(Number(cart_version))) return {kind:'invalid'};
  return {kind:'selected',skuIds,version:Number(cart_version)};
 }
 if (sku === undefined && quantity === undefined) return {kind:'cart'};
 const count = quantity ?? '1';
 if (!isCartSku(sku) || typeof count !== 'string' || !/^[1-9]\d?$/.test(count)) return {kind:'invalid'};
 return {kind:'direct',sku,quantity:Number(count)};
}

export function checkoutEntryPath(entry:CheckoutEntry):string {
 if (entry.kind === 'invalid') return '/cart';
 const query = new URLSearchParams();
 if (entry.kind === 'selected') {
  for (const sku of entry.skuIds) query.append('sku_id',sku);
  query.set('cart_version',String(entry.version));
 } else if (entry.kind === 'direct') {
  query.set('sku',entry.sku);
  query.set('quantity',String(entry.quantity));
 }
 return query.size ? '/checkout?'+query : '/checkout';
}

export function selectedCheckoutCart(cart:Cart,entry:Extract<CheckoutEntry,{kind:'selected'}>):Cart|null {
 if (entry.version !== cart.version) return null;
 const ids = new Set(entry.skuIds);
 const items = cart.items.filter(item=>ids.has(item.sku_id));
 if (items.length !== entry.skuIds.length) return null;
 return {...cart,items,item_count:items.reduce((sum,item)=>sum+item.quantity,0),
  total:items.reduce((sum,item)=>sum+(item.available ? item.line_total ?? 0 : 0),0),
  has_unavailable:items.some(item=>!item.available)};
}
