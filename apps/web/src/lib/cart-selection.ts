import type {CartItem} from './customer-shopping.ts';

export function cartEstimate(items: CartItem[], policy?: {base_fee:number; free_threshold:number} | null) {
  const available = items.filter(item => item.available && item.line_total !== null);
  const subtotal = available.reduce((sum, item) => sum + item.line_total!, 0);
  const original = available.reduce((sum, item) => sum + (item.price ?? item.effective_price!) * item.quantity, 0);
  const shipping = !available.length ? 0 : policy ? (subtotal >= policy.free_threshold ? 0 : policy.base_fee) : null;
  return {original, discount: original - subtotal, subtotal, shipping, estimated: shipping === null ? null : subtotal + shipping};
}

export function previewQuantities(items: CartItem[], targets: ReadonlyMap<string,number>): CartItem[] {
  if (!targets.size) return items;
  return items.map(item => {
    const quantity=targets.get(item.sku_id);
    if (quantity===undefined || !Number.isInteger(quantity) || item.effective_price === null || quantity < 1 || quantity > Math.min(99, item.available_quantity)) return item;
    return {...item, quantity, available: true, line_total: item.effective_price * quantity};
  });
}
