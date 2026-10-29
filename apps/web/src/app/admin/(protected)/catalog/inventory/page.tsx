import { requireAdminSession } from '@/lib/admin-session';
import { inventoryProductFilter } from '@/lib/inventory-summary';
import { stockFilter } from '@/lib/inventory-overview';
import { CatalogManager } from '../catalog-manager';

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ saved?: string; product_id?: string | string[]; stock?: string | string[] }> }) {
  await requireAdminSession();
  const query = await searchParams;
  return <CatalogManager mode="inventory" productId={inventoryProductFilter(query.product_id)} stockFilter={stockFilter(query.stock)} savedMovementId={typeof query.saved === 'string' ? query.saved : ''} />;
}
