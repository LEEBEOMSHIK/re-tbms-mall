import { getAdminSession } from '@/lib/admin-session';
import { readWorkboardSource } from '@/lib/workboard-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
  };
  if (!await getAdminSession()) return new Response('관리자 로그인이 필요합니다.', {status:401,headers});
  try {
    return new Response(await readWorkboardSource(), { headers });
  } catch {
    return new Response('workboard.md를 읽을 수 없습니다. 저장소 파일과 실행 위치를 확인해 주세요.', { status: 503, headers });
  }
}