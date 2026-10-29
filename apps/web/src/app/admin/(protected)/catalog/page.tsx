import { requireAdminSession } from '@/lib/admin-session';
import { CatalogManager } from './catalog-manager';
export default async function CatalogPage() {
  await requireAdminSession();
  return <CatalogManager />;
}
