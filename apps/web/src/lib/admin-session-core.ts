import { randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'tbms_admin_session';
export const SESSION_SECONDS = 8 * 60 * 60;
export type AdminSession = { token: string; expiresAt: number };
const state = globalThis as typeof globalThis & { tbmsAdminSessions?: Map<string, AdminSession> };
const sessions = state.tbmsAdminSessions ??= new Map<string, AdminSession>();

export function createSession(token: string, now = Date.now()): string {
  for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id);
  // Local, single-process sessions. Bound the store without discarding active sessions.
  if (sessions.size >= 1000) throw new Error('Session capacity reached');
  const id = randomBytes(32).toString('hex');
  sessions.set(id, { token, expiresAt: now + SESSION_SECONDS * 1000 });
  return id;
}
export function lookupSession(id: string | undefined, now = Date.now()): AdminSession | null {
  if (!id) return null;
  const session = sessions.get(id);
  if (!session || session.expiresAt <= now) { sessions.delete(id); return null; }
  return session;
}
export function revokeSession(id: string | undefined) { if (id) sessions.delete(id); }
function requestTarget(request: Request): URL | null {
  try {
    const internal = new URL(request.url);
    if (!['http:', 'https:'].includes(internal.protocol)) return null;
    // Next may normalize request.url to localhost while the browser used 127.0.0.1.
    // Host is the actual requested authority; never accept forwarded-host/proto here.
    const host = request.headers.get('host') ?? internal.host;
    if (!/^(?:[a-zA-Z0-9.-]+|\[[0-9a-fA-F:]+\])(?::\d{1,5})?$/.test(host)) return null;
    return new URL(`${internal.protocol}//${host}`);
  } catch { return null; }
}
export function sameOrigin(request: Request): boolean {
  const target = requestTarget(request);
  return target !== null && request.headers.get('origin') === target.origin;
}
export function testLoginAllowed(request: Request, environment: string | undefined = process.env.NODE_ENV): boolean {
  if (environment !== 'development' || !sameOrigin(request)) return false;
  return ['127.0.0.1', 'localhost', '[::1]'].includes(requestTarget(request)!.hostname);
}
export function sessionCookieOptions(environment: string | undefined = process.env.NODE_ENV) {
  return { httpOnly: true, sameSite: 'strict' as const, path: '/', secure: environment === 'production', maxAge: SESSION_SECONDS };
}

export async function validateAdminToken(token: string, base: string, fetcher: typeof fetch = fetch): Promise<number> {
  try {
    const result = await fetcher(`${base}/api/v1/admin/storefront`, {
      cache: 'no-store', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000),
    });
    return result.ok ? 200 : result.status === 401 ? 401 : 503;
  } catch { return 503; }
}
