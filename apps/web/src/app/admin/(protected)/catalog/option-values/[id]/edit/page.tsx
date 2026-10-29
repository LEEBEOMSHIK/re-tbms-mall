import { requireAdminSession } from '@/lib/admin-session';
import { CatalogManager } from '../../../catalog-manager';

export default async function EditOptionValuePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  return <CatalogManager mode="option-value-edit" entityId={id} />;
}
