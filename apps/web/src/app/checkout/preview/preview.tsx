'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import './preview.css';
import '@/components/ui/form-controls.css';

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`;

export function CheckoutPreview() {
  const [quantity, setQuantity] = useState(2);
  const [region, setRegion] = useState('general');
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState('');
  const subtotal = quantity * 32000;
  const shipping = subtotal >= 50000 ? 0 : 3000;
  const restricted = region !== 'general';
  return <div className="ds-form checkout-preview">
    <aside className="checkout-sandbox"><strong>주문서 미리보기</strong><span>예시 상품으로 화면을 확인하는 시안입니다. 실제 개인정보를 입력하지 마세요. 주문·결제·재고 확보는 실행되지 않습니다.</span></aside>
    <div className="checkout-heading"><div><p className="eyebrow">CHECKOUT</p><h1>주문서</h1><p>선택한 옷과 배송 정보를 확인해 주세요.</p></div><Link href="/cart">장바구니로 돌아가기</Link></div>
    <ol className="checkout-steps" aria-label="주문 순서"><li>01 장바구니</li><li aria-current="step">02 주문서</li><li>03 주문 완료</li></ol>
    <details className="checkout-demo-tools"><summary>시안 테스트 도구</summary><div className="checkout-demo-controls"><label>상품 수량<select value={quantity} onChange={e=>{setQuantity(Number(e.target.value));setMessage('')}}><option value={1}>1개 · 배송비 발생</option><option value={2}>2개 · 무료배송</option></select></label><label>배송 지역 예시<select value={region} onChange={e=>{setRegion(e.target.value);setMessage('')}}><option value="general">국내 일반 지역</option><option value="jeju">제주</option><option value="remote">도서산간</option></select></label><small>무료배송·지역 제한 확인용입니다. 실제 주문 화면에는 표시되지 않습니다.</small></div></details>
    <div className="checkout-grid"><div className="checkout-sections">
      <section className="checkout-section"><div className="checkout-section-title"><h2>주문 상품</h2><span>{quantity}개</span></div>
        <div className="checkout-product"><Image src="/images/brand/human-ai.png" alt="AI 그래픽 티셔츠 디자인 예시" width={88} height={110}/><div><span className="checkout-subtle">디자인 예시 · 실제 판매 상품 아님</span><h3>HUMAN × AI 그래픽 티셔츠</h3><p>블랙 / M · {quantity}개</p><strong>{won(subtotal)}</strong><small>예시 단가 {won(32000)} · 할인 없음</small></div></div>
      </section>
      <section className="checkout-section"><div className="checkout-section-title"><h2>배송지</h2><span>국내 배송</span></div><p className="checkout-subtle">실제 구매 시 로그인한 계정에 주문이 연결됩니다. 아래 입력은 저장되지 않습니다.</p>
        <div className="checkout-fields"><label>받는 분<input autoComplete="off" placeholder="예시: 홍길동" maxLength={50}/></label><label>연락처<input autoComplete="off" type="tel" placeholder="예시: 010-0000-0000" maxLength={20}/></label><label className="checkout-wide">주소<input autoComplete="off" placeholder="주소 검색 위치 · 실제 주소 검색은 후속 연동" maxLength={150}/></label><label className="checkout-wide">상세 주소<input autoComplete="off" placeholder="동·호수 등 상세 주소" maxLength={100}/></label><label className="checkout-wide">배송 요청사항 <span className="checkout-subtle">(선택)</span><select defaultValue=""><option value="">선택해 주세요</option><option>문 앞에 놓아 주세요</option><option>배송 전 연락해 주세요</option><option>경비실에 맡겨 주세요</option></select></label></div>
        {restricted&&<p className="checkout-warning" role="alert">{region==='jeju'?'제주':'도서산간'} 지역은 추가 운임을 준비하고 있어요. 운임이 확정되기 전까지 결제를 진행할 수 없습니다.</p>}
        <div className="checkout-delivery"><strong>결제 확인 후 1~3영업일 이내 출고</strong><p>한 주문은 한 배송지로 함께 보내드립니다. 판매자 사정으로 나누어 보내는 경우 추가 배송비는 판매자가 부담합니다.</p></div>
      </section>
      <section className="checkout-section"><h2>결제 수단</h2><p>결제 서비스 준비 중입니다.</p><p className="checkout-subtle">PG 선정 후 사용 가능한 카드·간편결제 수단을 안내합니다.</p></section>
      <details className="checkout-policy"><summary>배송·취소·반품 안내</summary><p>기본 배송비 3,000원 · 할인 적용 후 상품금액 50,000원 이상 무료배송.</p><p>상품 준비 중 전에는 직접 취소할 수 있으며 이후에는 관리자 확인 후 처리합니다.</p><p>단순 변심·색상/사이즈 변경 배송비는 고객 부담, 불량·오배송은 판매자 부담입니다. 신청 기간은 법정 기준을 따릅니다.</p><p>방문 수거는 판매자가 접수합니다. 교환은 회수·검수와 필요한 배송비 결제 확인 후 1~3영업일 이내 출고합니다.</p></details>
    </div><aside className="checkout-summary"><p className="checkout-subtle">ORDER SUMMARY</p><h2>결제금액</h2><dl><div><dt>상품금액</dt><dd>{won(subtotal)}</dd></div><div><dt>배송비</dt><dd>{restricted?'확정 전':shipping===0?'무료':won(shipping)}</dd></div></dl><div className="checkout-grand" aria-live="polite"><span>총 결제 예정금액</span><strong>{restricted?'확정 전':won(subtotal+shipping)}</strong></div><p className="checkout-subtle">{restricted?'추가 운임 확정 후 주문할 수 있어요.':shipping===0?'무료배송 기준을 충족했어요.':`${won(50000-subtotal)} 더 담으면 기본 배송비가 무료예요.`}</p>
      <label className="checkout-agree"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>예시 상품과 배송 정보를 확인했습니다.</label>
      <button className="checkout-action" disabled={restricted} onClick={()=>setMessage(reviewed?'시안 확인이 완료됐어요. 실제 주문이나 결제는 생성되지 않았습니다.':'상품과 배송 정보 확인 항목을 체크해 주세요.')}>{restricted?'배송 지역 확인 필요':'주문서 시안 확인'}</button>
      <p className="checkout-feedback" role="status">{message}</p><p className="checkout-subtle">실제 서비스에서는 결제하기를 누르면 10분간 재고를 확보하고, 결제 승인 시 구매가 확정됩니다.</p>
    </aside></div>
  </div>;
}
