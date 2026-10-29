import type { Catalog } from './catalog.ts';

/** Historical totals describe records; current stock always comes from the SKU. */
export function inventorySummary(catalog: Catalog) {
  const totals = new Map<string, { received: number; sold: number; otherOut: number; adjusted: number }>();
  for (const movement of catalog.movements) {
    const row = totals.get(movement.sku_id) || { received: 0, sold: 0, otherOut: 0, adjusted: 0 };
    if (movement.reason_code === 'receipt') row.received += movement.delta;
    else if (movement.reason_code === 'sale') row.sold -= movement.delta;
    else if (['gift', 'disposal', 'other_out'].includes(movement.reason_code || '')) row.otherOut -= movement.delta;
    else if (movement.reason_code === 'adjust_in' || movement.reason_code === 'adjust_out') row.adjusted += movement.delta;
    totals.set(movement.sku_id, row);
  }
  return catalog.skus.map(sku => ({
    sku, product: catalog.products.find(product => product.id === sku.product_id),
    ...(totals.get(sku.id) || { received: 0, sold: 0, otherOut: 0, adjusted: 0 }),
    current: sku.on_hand, low: sku.on_hand <= sku.reorder_point,
  }));
}

export function inventoryMatches(row: ReturnType<typeof inventorySummary>[number], query: string) {
  const search = query.trim().toLocaleLowerCase();
  return !search || [row.product?.name, row.product?.internal_name, row.sku.color, row.sku.size, row.sku.code].join(' ').toLocaleLowerCase().includes(search);
}

/** An explicit unknown product never falls back to the whole catalog. */
export function scopeInventoryCatalog(catalog: Catalog, productId: string): Catalog {
  if (!productId) return catalog;
  const products = catalog.products.filter(product => product.id === productId);
  const skus = products.length ? catalog.skus.filter(sku => sku.product_id === productId) : [];
  const skuIds = new Set(skus.map(sku => sku.id));
  return {...catalog, products, skus, movements: catalog.movements.filter(movement => skuIds.has(movement.sku_id)),
    product_readiness: catalog.product_readiness?.filter(readiness => readiness.product_id === productId)};
}

export function productStockSummary(catalog: Catalog, productId: string) {
  const skus = catalog.skus.filter(sku => sku.product_id === productId);
  return {count: skus.length, onHand: skus.reduce((sum, sku) => sum + sku.on_hand, 0)};
}

export function inventoryProductFilter(value: string | string[] | undefined): string {
  if (value === undefined) return '';
  return typeof value === 'string' && value.length > 0 ? value : '__invalid_product_filter__';
}
