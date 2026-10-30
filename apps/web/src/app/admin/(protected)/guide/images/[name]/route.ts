import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getAdminSession } from '@/lib/admin-session';
import { GUIDE_CAPTURES } from '@/lib/admin-guide-captures';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!await getAdminSession()) return new Response('Unauthorized', { status: 401, headers });
  const { name } = await params;
  if (!/^[a-zA-Z0-9_-]+\.jpg$/.test(name) || !Object.values(GUIDE_CAPTURES).some(capture => capture.file === name)) return new Response('Not found', { status: 404, headers });
  const directories = [path.join(process.cwd(), 'guide-assets'), path.join(process.cwd(), 'apps', 'web', 'guide-assets')];
  for (const directory of directories) {
    try {
      const data = await readFile(path.join(directory, name));
      return new Response(new Uint8Array(data), { headers: { ...headers, 'Content-Type': 'image/jpeg' } });
    } catch { /* Only try the known application asset directories. */ }
  }
  return new Response('Not found', { status: 404, headers });
}
