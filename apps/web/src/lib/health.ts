export type HealthResult = { status: 'connected' } | { status: 'error'; reason: 'unavailable' | 'invalid-response' | 'timeout' };

type HealthOptions = { fetcher?: typeof fetch; timeoutMs?: number };

export async function checkApiHealth(baseUrl: string, { fetcher = fetch, timeoutMs = 5000 }: HealthOptions = {}): Promise<HealthResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(`${baseUrl.replace(/\/+$/, '')}/api/v1/health`, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return { status: 'error', reason: 'unavailable' };
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { status: 'error', reason: controller.signal.aborted ? 'timeout' : 'invalid-response' };
    }
    if (typeof payload !== 'object' || payload === null || !('status' in payload) || !('service' in payload) || payload.status !== 'ok' || payload.service !== 're-tbms-mall-api') {
      return { status: 'error', reason: 'invalid-response' };
    }
    return { status: 'connected' };
  } catch {
    return { status: 'error', reason: controller.signal.aborted ? 'timeout' : 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
