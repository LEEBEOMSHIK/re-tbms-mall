const steps = [
  {title:'신청하기', text:'상품·수량·사유와 회수 주소를 입력해요.', path:'M7 4h10v16H7z M10 8h4 M10 12h4 M10 16h2'},
  {title:'신청 내용 확인', text:'신청 기간·상품 상태와 배송비를 확인해 안내해요.', path:'M15 15l5 5 M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14'},
  {title:'방문 수거', text:'판매자가 지정 택배사의 수거를 접수해요. 안내 후 상품을 포장해 주세요.', path:'M3 6h11v11H3z M14 10h4l3 4v3h-7 M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4'},
  {title:'도착·검수', text:'돌아온 상품의 상태와 신청 내용을 확인해요.', path:'M3 7l9-4 9 4v12l-9 3-9-3z M3 7l9 4 9-4 M12 11v11 M8 15l2 2 5-5'},
];

export function ClaimRequestGuide({sellerPays}: {sellerPays:boolean}) {
  return <div className="claim-guide">
    <section className="claims-panel claim-guide-policy" aria-labelledby="claim-guide-title">
      <p className="eyebrow">REQUEST GUIDE</p><h2 id="claim-guide-title">신청 전 확인해 주세요</h2>
      <p className="claim-guide-intro">한 번에 한 상품씩 신청해 주세요.<br/>같은 상품은 신청할 수량을 선택할 수 있어요.</p>
      <ul className="claim-guide-notes">
        <li><strong>배송비 부담</strong><p>{sellerPays?'불량·오배송은 판매자가 부담해요.':'단순 변심·색상·사이즈 변경은 고객이 부담해요.'} 합회수·무료배송 주문의 정산 금액은 확인 후 안내해요.</p></li>
        <li><strong>신청 후 확인</strong><p>법정 신청 기간과 상품 상태를 확인해요. 접수 즉시 환불되거나 교환 상품이 발송되지는 않아요.</p></li>
      </ul>
    </section>
    <section className="claims-panel claim-guide-flow" aria-labelledby="claim-flow-title">
      <h2 id="claim-flow-title">이렇게 진행돼요</h2><p className="claims-muted">반품과 교환은 검수까지 같은 순서로 진행돼요.</p>
      <ol className="claim-flow-steps">{steps.map((step,index)=><li key={step.title}>
        <span className="claim-flow-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={step.path}/></svg></span>
        <div><strong><span className="claim-flow-number">0{index+1}</span>{step.title}</strong><p>{step.text}</p></div>
      </li>)}</ol>
      <div className="claim-flow-outcomes" aria-label="검수 후 반품과 교환 절차">
        <div><span className="claim-flow-kind">반품</span><strong>환불 안내</strong><p>검수와 배송비 정산을 확인한 뒤 환불 절차를 안내해요.</p></div>
        <div><span className="claim-flow-kind">교환</span><strong>교환 상품 출고</strong><p>검수와 필요한 배송비 결제 확인 후 1~3영업일 이내 출고해요. 품절이면 안내 후 동의를 받아 반품·환불로 전환해요.</p></div>
      </div>
      <p className="claim-flow-notice">현재는 접수·진행 상황 확인을 제공해요. 온라인 환불·택배 자동 접수·교환 출고 연동은 준비 중이며, 접수 내역에서 다음 절차를 안내해요.</p>
    </section>
  </div>;
}
