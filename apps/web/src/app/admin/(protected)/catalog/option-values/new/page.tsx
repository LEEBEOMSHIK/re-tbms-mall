import { requireAdminSession } from '@/lib/admin-session';
import { CatalogManager } from '../../catalog-manager';

export default async function NewOptionValuePage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireAdminSession();
  const { kind } = await searchParams;
  return <CatalogManager mode="option-value-new" optionKind={kind === 'size' ? 'size' : 'color'} />;
}
