import {parseAdminMenu} from './admin-menu.ts';

export async function loadAdminNavigation(signal: AbortSignal, fetcher: typeof fetch = fetch) {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetcher('/api/admin/navigation', {
        cache: 'no-store', credentials: 'same-origin',
        // The upstream proxy allows 15 seconds, including a cold API start.
        signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
      });
    } catch {
      if (!signal.aborted && attempt === 0) continue;
      throw new Error('메뉴 설정 서버에 연결하지 못했습니다.');
    }
    if (response.status === 401 || response.status === 403)
      throw new Error('관리자 로그인 상태를 확인해 주세요.');
    if (response.status >= 500 && attempt === 0 && !signal.aborted) continue;
    if (!response.ok) throw new Error('메뉴 설정 서버에서 응답을 받지 못했습니다.');
    try { return parseAdminMenu(await response.json()); }
    catch { throw new Error('메뉴 설정 형식을 확인하지 못했습니다.'); }
  }
}
