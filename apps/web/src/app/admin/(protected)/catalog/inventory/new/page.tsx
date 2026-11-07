import { requireAdminSession } from '@/lib/admin-session';
import { inventoryProductFilter } from '@/lib/inventory-summary';
import { CatalogManager } from '../../catalog-manager';
export default async function NewInventoryMovementPage({ searchParams }: { searchParams: Promise<{ flow?: string | string[]; product_id?: string | string[]; sku_id?: string | string[] }> }) {
  await requireAdminSession();
  const { flow, product_id, sku_id } = await searchParams;
  return <CatalogManager mode="inventory-new" skuId={typeof sku_id === 'string' ? sku_id : ''} productId={inventoryProductFilter(product_id)} inventoryFlow={typeof flow === 'string' && ['receipt', 'out', 'adjust', 'customer', 'other'].includes(flow) ? flow : ''} />;
}
