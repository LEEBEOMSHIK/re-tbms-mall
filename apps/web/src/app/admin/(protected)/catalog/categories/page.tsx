import { requireAdminSession } from '@/lib/admin-session';
import { CatalogManager } from '../catalog-manager';

export default async function CategoriesPage() {
  await requireAdminSession();
  return <CatalogManager mode="categories" />;
}
