'use client';

import Link from 'next/link';
import {useRef,useState} from 'react';
import {carrierDocuments,carrierInquiry} from '@/lib/carrier-preparation';
import '../payment-preparation/preparation.css';

export function CarrierPreparation() {
  const inquiry = useRef<HTMLTextAreaElement>(null);
  const [feedback,setFeedback] = useState('');
  async function copyInquiry() {
    try {
      await navigator.clipboard.writeText(carrierInquiry);
      setFeedback('문의문을 복사했습니다. 빈칸을 채운 뒤 후보 업체에 보내세요.');
    } catch {
      inquiry.current?.focus();
      inquiry.current?.select();
      setFeedback('문의문을 선택했습니다. 직접 복사해 주세요.');
    }
  }
  return <main id="main" className="pg-preparation">
    <header><p className="eyebrow">SHIPPING PARTNERS</p><h1>택배사 선정 준비</h1>
      <p>후보 업체에 같은 출고 조건을 보내고, 계약 운임과 실제 배송 가능한 지역을 비교하세요.</p>
      <Link href="/admin/workboard">선정 진행 상황 보기 →</Link></header>
    <nav aria-label="택배사 견적 준비 항목"><a href="#carrier-profile">문의 전 준비</a><a href="#carrier-inquiry">견적 문의문</a><a href="#carrier-files">받을 자료</a><a href="#carrier-compare">비교·선정</a></nav>
    <section id="carrier-profile"><h2>1. 문의 전 준비</h2>
      <p>후보 예시로 CJ대한통운·한진·롯데택배에 동일한 조건을 제시하세요. 출고지 관할 집하점이 다르면 담당 지점도 함께 기록하세요.</p>
      <div className="pg-cards"><article><h3>발송과 회수</h3><p>집하·반품 입고지, 희망 집하 시간, 월 출고량과 회수량을 준비하세요. 판매 전이면 예상치로 표시하세요.</p></article>
      <article><h3>대표 포장 두 가지</h3><p>티셔츠 한 장과 합배송 묶음을 각각 포장한 뒤 크기·중량을 재세요. 단품과 묶음에 적용되는 운임을 따로 비교할 수 있습니다.</p></article></div></section>
    <section id="carrier-inquiry"><h2>2. 견적 문의문</h2><label htmlFor="carrier-text">업체에 보낼 공통 문의문</label>
      <textarea ref={inquiry} id="carrier-text" readOnly value={carrierInquiry} rows={10}/>
      <button type="button" onClick={copyInquiry}>문의문 복사</button><p role="status">{feedback}</p></section>
    <section id="carrier-files"><h2>3. 업체에서 받을 자료</h2><div className="pg-cards">{carrierDocuments.map(([title,body])=><article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section id="carrier-compare"><h2>4. 회신 비교와 선정</h2>
      <p>후보별로 업체·담당 지점, 견적일·유효기간, 월 예상 비용, 집하 마감, 지역표 버전과 미회신 항목을 한 줄씩 기록하세요.</p>
      <dl><dt>비용 비교</dt><dd>같은 물량과 포장으로 일반 발송, 반품 회수, 교환 재발송, 지역 할증·최소요금을 합산하고 부가세 기준을 맞춥니다.</dd>
      <dt>지역 판정</dt><dd>배송 불가 → 추가 운임 → 일반 지역 순서로 대조합니다. 동일 우편번호의 일부 주소에만 적용되면 주소 예외까지 확인합니다. 목록이 완전하다는 업체 확인이 없으면 목록 밖 주소는 확인 필요로 둡니다.</dd>
      <dt>쇼핑몰 정책</dt><dd>일반 지역 고객 배송비는 3,000원이며 할인 후 상품금액 5만 원 이상은 무료입니다. 택배사 계약 단가와 구분하세요. 제주·도서산간은 추가 운임을 확정할 때까지 결제를 제한합니다.</dd></dl>
      <p>주 택배사와 고객 부담 추가 운임, 적용할 지역표와 시행일을 결정한 뒤 주문서 판정에 반영합니다.</p></section>
    <footer><Link href="/admin/guide#guide-carrier-preparation">사용 가이드에서 준비 순서 보기 →</Link></footer>
  </main>;
}
