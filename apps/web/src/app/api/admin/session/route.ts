import {FACTORY_SESSION_COOKIE,revokeFactorySession,factoryCookieOptions} from '@/lib/factory-session-core';
import { cookies } from 'next/headers';
import { adminApiBase, getAdminSession, localTestToken } from '@/lib/admin-session';
import { createSession, revokeSession, sameOrigin, SESSION_COOKIE, sessionCookieOptions, testLoginAllowed, validateAdminToken } from '@/lib/admin-session-core';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() { const session=await getAdminSession(); return reply({ authenticated: Boolean(session), expiresAt: session?.expiresAt ?? null }); }
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: '허용하지 않는 요청입니다.' }, 403);
  let body: unknown;
  try { const text = await request.text(); if (text.length > 4096) return reply({ error: '입력이 너무 깁니다.' }, 422); body = JSON.parse(text); }
  catch { return reply({ error: '로그인 입력을 확인해 주세요.' }, 422); }
  if (!body || typeof body !== 'object') return reply({ error: '로그인 입력을 확인해 주세요.' }, 422);
  const input = body as { mode?: unknown; key?: unknown };
  let token = '';
  if (input.mode === 'test') {
    if (!testLoginAllowed(request)) return reply({ error: '테스트 로그인은 로컬 개발에서만 사용할 수 있습니다.' }, 403);
    token = await localTestToken();
    if (!token) return reply({ error: '로컬 관리자 키 설정을 확인해 주세요.' }, 503);
  } else if (input.mode === 'key' && typeof input.key === 'string' && input.key.trim() && input.key.length <= 1024) token = input.key.trim();
  else return reply({ error: '관리자 접근 키를 입력해 주세요.' }, 422);
  const status = await validateAdminToken(token, adminApiBase());
  if (status !== 200) return reply({ error: status === 401 ? '관리자 접근 키를 확인해 주세요.' : '관리 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, status);
  const jar = await cookies();
  try {
    const id = createSession(token);
    revokeSession(jar.get(SESSION_COOKIE)?.value);
    jar.set(SESSION_COOKIE, id, sessionCookieOptions());
    revokeFactorySession(jar.get(FACTORY_SESSION_COOKIE)?.value);
    jar.set(FACTORY_SESSION_COOKIE, '', {...factoryCookieOptions(), maxAge:0});
  } catch { return reply({ error: '로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 503); }
  return reply({ authenticated: true });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return reply({ error: '허용하지 않는 요청입니다.' }, 403);
  const jar = await cookies();
  revokeSession(jar.get(SESSION_COOKIE)?.value);
  jar.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return reply({ authenticated: false });
}
