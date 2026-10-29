import { requireAdminSession } from '@/lib/admin-session';
import { CatalogManager } from '../../catalog-manager';

export default async function NewOptionPage({
  searchParams,
}: { searchParams: Promise<{ product_id?: string | string[] }> }) {
  await requireAdminSession();
  const { product_id } = await searchParams;
  return <CatalogManager mode="options" productId={typeof product_id === 'string' ? product_id : ''} />;
}
