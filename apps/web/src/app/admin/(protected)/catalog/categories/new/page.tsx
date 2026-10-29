import { requireAdminSession } from '@/lib/admin-session';
import { CatalogManager } from '../../catalog-manager';

export default async function NewCategoryPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAdminSession();
  const query = await searchParams;
  return <CatalogManager mode="category-new" categoryKind={query.type === 'child' ? 'child' : 'root'} />;
}
