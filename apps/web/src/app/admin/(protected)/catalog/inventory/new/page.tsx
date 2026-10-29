import { requireAdminSession } from '@/lib/admin-session';
import { inventoryProductFilter } from '@/lib/inventory-summary';
import { CatalogManager } from '../../catalog-manager';
export default async function NewInventoryMovementPage({ searchParams }: { searchParams: Promise<{ flow?: string | string[]; product_id?: string | string[] }> }) {
  await requireAdminSession();
  const { flow, product_id } = await searchParams;
  return <CatalogManager mode="inventory-new" productId={inventoryProductFilter(product_id)} inventoryFlow={typeof flow === 'string' && ['receipt', 'out', 'adjust', 'customer', 'other'].includes(flow) ? flow : ''} />;
}
