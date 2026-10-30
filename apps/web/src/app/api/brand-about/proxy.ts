import { adminApiBase, getAdminSession } from '@/lib/admin-session';
import { sameOrigin } from '@/lib/admin-session-core';
import { ASSET_ID, parseBrandState, parseBrandUpload, parsePublicBrand, readBrandBody } from '@/lib/brand-about';
const reply = (body: object, status = 200) => Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
export async function brandProxy(request: Request, admin: boolean, suffix = '') {
  const method = request.method;
  const session = admin ? await getAdminSession() : null;
  if (admin && !session) return reply({error: '관리자 로그인이 필요합니다.'}, 401);
  if (method !== 'GET' && (!admin || !sameOrigin(request))) return reply({error:'허용하지 않는 요청입니다.'},403);
  const asset = suffix.startsWith('/assets/');
  if (asset && !ASSET_ID.test(suffix.slice('/assets/'.length))) return reply({error:'이미지를 찾을 수 없습니다.'},404);
  let body: string | undefined;
  if (method !== 'GET') {
    try { body = new TextDecoder().decode(await readBrandBody(request, suffix === '/assets' ? 3*1024*1024 : 131072)); JSON.parse(body); }
    catch (error) { return reply({error:'입력 형식 또는 크기를 확인해 주세요.'}, error instanceof Error && error.message === 'Too large' ? 413 : 422); }
  }
  try {
    const upstream = await fetch(`${adminApiBase()}/api/v1/${admin ? 'admin/' : ''}brand-about${suffix}`, {method, body, cache:'no-store',signal:AbortSignal.timeout(15000),headers:{...(session ? {Authorization:`Bearer ${session.token}`} : {}),...(body ? {'Content-Type':'application/json'} : {})}});
    if (!upstream.ok) return reply({error:'요청을 처리하지 못했습니다.'},[401,403,404,409,413,422].includes(upstream.status)?upstream.status:503);
    if (asset) { const type = upstream.headers.get('content-type')?.split(';')[0]; if (!type || !['image/png','image/jpeg','image/webp'].includes(type)) throw Error('Invalid image'); const bytes = await readBrandBody(upstream, 12*1024*1024); return new Response(Buffer.from(bytes),{headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
    const data: unknown = JSON.parse(new TextDecoder().decode(await readBrandBody(upstream,131072)));
    return reply(suffix === '/assets' ? parseBrandUpload(data) : admin ? parseBrandState(data) : parsePublicBrand(data));
  } catch { return reply({error:'서버 응답을 확인하지 못했습니다. 최신 상태를 확인해 주세요.'},503); }
}
