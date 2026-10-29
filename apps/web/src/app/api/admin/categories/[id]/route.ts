import { catalogProxy } from '@/lib/catalog-proxy';
import { parseCategory } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) return Response.json({ error: '대상을 찾을 수 없습니다.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return catalogProxy(request, `categories/${id}`, 'PUT', parseCategory);
}
