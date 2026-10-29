'use client';
import { useEffect, useState } from 'react';
import { checkApiHealth, type HealthResult } from '@/lib/health';

type ConnectionState = HealthResult | { status: 'checking' };
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8100';
const errorMessages = {
  unavailable: 'API에 연결할 수 없습니다. 로컬 API 실행 상태와 연결 설정을 확인한 뒤 다시 시도해 주세요.',
  'invalid-response': '예상한 상태 응답을 받지 못했습니다. API 주소와 실행 버전을 확인해 주세요.',
  timeout: '응답을 기다리는 시간이 초과되었습니다. API 실행 상태를 확인하고 다시 시도해 주세요.',
};
export function ApiStatus() {
  const [state, setState] = useState<ConnectionState>({ status: 'checking' });
  useEffect(() => {
    let active = true;
    void checkApiHealth(baseUrl).then(result => { if (active) setState(result); });
    return () => { active = false; };
  }, []);
  async function retry() {
    setState({ status: 'checking' });
    setState(await checkApiHealth(baseUrl));
  }
  const label = state.status === 'checking' ? '연결 확인 중' : state.status === 'connected' ? 'API 연결됨' : '연결 확인 필요';
  return (
    <section className="connection-panel" aria-labelledby="connection-title">
      <div className="section-heading"><div><p className="eyebrow">LOCAL CONNECTION</p><h2 id="connection-title">개발 환경 상태</h2></div><span className="small-label">WEB → API</span></div>
      <div className="connection-body">
        <div role="status" aria-live="polite" aria-atomic="true">
          <p className={`status-label ${state.status}`}><span aria-hidden="true">{state.status === 'connected' ? '✓' : state.status === 'error' ? '!' : '·'}</span>{label}</p>
          <p className="status-description">{state.status === 'checking' ? '로컬 API의 상태 응답을 확인하고 있습니다.' : state.status === 'connected' ? '웹에서 API 상태 응답을 정상적으로 받았습니다. 상품·재고 기능의 구현 상태를 의미하지는 않습니다.' : errorMessages[state.reason]}</p>
        </div>
        <button className="button" type="button" onClick={retry} disabled={state.status === 'checking'}>{state.status === 'checking' ? '확인 중…' : '연결 다시 확인'}<span aria-hidden="true">↗</span></button>
      </div>
      <p className="connection-note">연결 확인은 상태 조회만 수행하며 상품이나 재고 데이터를 변경하지 않습니다.</p>
    </section>
  );
}

