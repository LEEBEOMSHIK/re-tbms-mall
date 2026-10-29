import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { lookupSession, SESSION_COOKIE } from './admin-session-core';

export async function getAdminSession() { return lookupSession((await cookies()).get(SESSION_COOKIE)?.value); }
export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}
export function adminApiBase() { return (process.env.ADMIN_API_BASE_URL || 'http://127.0.0.1:8100').replace(/\/$/, ''); }
export async function localTestToken(): Promise<string> {
  if (process.env.NODE_ENV !== 'development') return '';
  if (process.env.STORE_ADMIN_TOKEN !== undefined) return process.env.STORE_ADMIN_TOKEN.trim();
  const cwd = process.cwd();
  const root = path.basename(cwd) === 'web' && path.basename(path.dirname(cwd)) === 'apps' ? path.resolve(cwd, '../..') : cwd;
  try {
    const text = await readFile(path.join(root, 'services/api/.env'), 'utf8');
    const matches = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => /^STORE_ADMIN_TOKEN=/.test(line));
    if (matches.length !== 1) return '';
    const value = matches[0].slice('STORE_ADMIN_TOKEN='.length).trim();
    return /^(".*"|'.*')$/.test(value) ? value.slice(1, -1) : value;
  } catch { return ''; }
}
