import { catalogProxy } from '@/lib/catalog-proxy';
import { parseCategory } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return catalogProxy(request, 'categories', 'POST', parseCategory);
}
