import { requireAdminSession } from '@/lib/admin-session';
import { CatalogManager } from '../catalog-manager';

export default async function NewProductPage() {
  await requireAdminSession();
  return <CatalogManager mode="product" />;
}
