import { getAdminSession, adminApiBase } from '@/lib/admin-session';
import { sameOrigin } from '@/lib/admin-session-core';
import { parseStorefront } from '@/lib/storefront';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function proxy(request: Request, method: 'GET' | 'PUT') {
  const session = await getAdminSession();
  if (!session) return reply({ error: '관리자 로그인이 필요합니다.' }, 401);
  if (method === 'PUT' && !sameOrigin(request)) return reply({ error: '허용하지 않는 요청입니다.' }, 403);
  let body: string | undefined;
  if (method === 'PUT') {
    try { body = await request.text(); if (body.length > 131072) return reply({ error: '입력이 너무 깁니다.' }, 422); JSON.parse(body); }
    catch { return reply({ error: '저장할 내용을 확인해 주세요.' }, 422); }
  }
  try {
    const response = await fetch(`${adminApiBase()}/api/v1/admin/storefront`, {
      method, body, cache: 'no-store', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${session.token}`, ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}) },
    });
    if (!response.ok) return reply({ error: '진열 요청을 처리하지 못했습니다.' }, [401,409,422].includes(response.status) ? response.status : 503);
    return reply(parseStorefront(await response.json()));
  } catch { return reply({ error: '관리 서버에 연결하지 못했습니다.' }, 503); }
}
export async function GET(request: Request) { return proxy(request, 'GET'); }
export async function PUT(request: Request) { return proxy(request, 'PUT'); }
