import { requireAdminSession } from '@/lib/admin-session';
import { CatalogManager } from '../catalog-manager';

export default async function OptionValuesPage() {
  await requireAdminSession();
  return <CatalogManager mode="option-values" />;
}
