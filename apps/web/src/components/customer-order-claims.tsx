'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {claimKinds, claimStatuses, parseClaims, type ClaimSummary} from '@/lib/order-claims';
import type {OrderDetail} from '@/lib/sales-orders';
import {productSizeLabel} from '@/lib/product-option-labels';

export function CustomerOrderClaims({order}: {order: OrderDetail}) {
  const [claims, setClaims] = useState<ClaimSummary[]>([]);
  const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const eligible = order.payment_status === 'succeeded' && ['confirmed', 'closed'].includes(order.status)
    && ['shipped', 'partially_shipped', 'delivered'].includes(order.fulfillment_status);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    const reset = () => {
      current = false; controller.abort(); setClaims([]); setSignedOut(true);
    };
    window.addEventListener('customer-session-changed', reset);
    void fetch('/api/customer/claims?order_id=' + encodeURIComponent(order.id), {
      cache: 'no-store', credentials: 'same-origin',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
    }).then(async response => {
      if (response.status === 401 && current) setSignedOut(true);
      if (!response.ok) throw new Error('조회 실패');
      const result = parseClaims(await response.json());
      if (current) { setClaims(result.claims); setNext(!!result.next_cursor); setError(false); }
    }).catch(() => { if (current && !controller.signal.aborted) setError(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); window.removeEventListener('customer-session-changed', reset); };
  }, [order.id, attempt]);

  if (signedOut || (!eligible && !loading && !error && claims.length === 0)) return null;
  return <div className="sales-aftercare">
    {eligible && <section className="sales-claim-entry" aria-label="상품 반품·교환 신청">
      <div className="sales-claim-copy"><strong>상품 반품·교환이 필요하신가요?</strong><p>상품과 수량을 선택해 신청해 주세요.</p></div>
      <Link className="sales-claim-primary" href={'/account/claims/new?order_id=' + order.id}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h11a5 5 0 0 1 0 10h-4M8 4 4 8l4 4"/></svg>
        반품·교환 신청<span aria-hidden="true">→</span>
      </Link>
    </section>}
    {loading ? <p className="sales-claim-loading" role="status">이 주문의 신청 상태 확인 중…</p>
      : error ? <div className="sales-claim-error" role="status"><span>신청 현황을 불러오지 못했어요.</span><button type="button" onClick={() => {setLoading(true); setError(false); setAttempt(value => value + 1);}}>다시 확인</button></div>
      : claims.length > 0 && <section className="sales-claim-progress" aria-label="이 주문의 신청 현황">
        <h3>이 주문의 신청 현황</h3>
        <ul>{claims.map(claim => <li key={claim.id}><Link href={'/account/claims/' + claim.id}>
          <div><strong>{claimKinds[claim.kind]} · {claim.quantity}개</strong><span>{claim.product_name} · {claim.color} / {productSizeLabel(claim.size)}</span></div>
          <span className="sales-claim-status">{claimStatuses[claim.status]}<span aria-hidden="true">→</span></span>
        </Link></li>)}</ul>
        {next && <Link className="sales-claim-more" href={'/account/claims?order_id=' + order.id}>이 주문의 신청 더 보기 →</Link>}
      </section>}
  </div>;
}
