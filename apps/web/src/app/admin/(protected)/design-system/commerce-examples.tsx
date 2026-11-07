'use client';

import {useState} from 'react';
import {FormChoice} from '@/components/ui/form-controls';
import {KeyFacts, ValueStatus} from '@/components/ui/key-facts';
import {StatusBadge} from '@/components/ui/status-badge';
import {ProductOptionPreview} from '@/components/product-option-preview';
import {ShopPrice} from '@/components/shop-price';
import {calculatePricing} from '@/lib/pricing';
import {GalleryExample} from './gallery-example';
import styles from './commerce-examples.module.css';

const options=[{color:'아이보리',size:'S'},{color:'아이보리',size:'M'},{color:'네이비',size:'M'}];
const regular=calculatePricing(35000,null);
const discounted=calculatePricing(35000,28000);

function Buttons(){
  const [count,setCount]=useState(0);
  const [page,setPage]=useState(1);
  const [deleteStage,setDeleteStage]=useState<'ready'|'confirm'|'deleted'>('ready');
  return <>
    <GalleryExample title="구매와 장바구니" usage="구매 준비가 끝난 상품은 담을 수 있습니다. 결제 서비스 준비 중에는 결제 버튼을 비활성화합니다." source="고객 · 상품 상세 / 주문서">
      <div className={styles.row}><button type="button" className="button" onClick={()=>setCount(n=>n+1)}>장바구니 담기</button><button type="button" disabled>결제 준비 중</button></div>
      <p className={styles.note} role="status">예시 장바구니 {count}개</p>
    </GalleryExample>
    <GalleryExample title="삭제와 취소" usage="삭제할 대상을 먼저 보여주고, 확인 단계에서 확정하거나 편집으로 돌아갈 수 있게 합니다." source="관리자 · 홈 진열 섹션 수정">
      <p className={styles.name}>봄 기획전</p>
      {deleteStage==='ready'?<button type="button" className={styles.danger} onClick={()=>setDeleteStage('confirm')}>섹션 삭제</button>:deleteStage==='confirm'?<><p>예시 섹션을 삭제할까요?</p><div className={styles.row}><button type="button" className={styles.danger} onClick={()=>setDeleteStage('deleted')}>삭제 확인</button><button type="button" onClick={()=>setDeleteStage('ready')}>취소</button></div></>:<><p role="status">예시 섹션이 삭제되었습니다.</p><button type="button" onClick={()=>setDeleteStage('ready')}>예시 다시 보기</button></>}
    </GalleryExample>
    <GalleryExample title="이전·다음 아이콘" usage="화살표는 방향을 나타냅니다. 현재 묶음과 전체 묶음 수를 함께 보여줍니다." source="고객 · 홈 상품 컬렉션">
      <div className={styles.row}><span aria-live="polite">{String(page).padStart(2,'0')} / 03</span>{([-1,1] as const).map(direction=><button key={direction} type="button" className={styles.icon} aria-label={direction<0?'예시 이전 상품':'예시 다음 상품'} onClick={()=>setPage(n=>(n-1+direction+3)%3+1)}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d={direction<0?'M13 4l-6 6 6 6':'M7 4l6 6-6 6'}/></svg></button>)}</div>
    </GalleryExample>
  </>;
}

function Cards(){
  const [picked,setPicked]=useState(false);
  return <>
    <GalleryExample title="재고 요약 카드" usage="품목 수와 부족 상태를 함께 읽습니다. 부족 옵션은 아이콘과 문구로도 구분합니다." source="관리자 · 재고 현황 / 상품 상세">
      <KeyFacts label="예시 재고 요약" items={[{label:'전체 옵션',value:'6개'},{label:'부족 옵션',value:<StatusBadge kind="low_stock">2개 부족</StatusBadge>}]}/>
    </GalleryExample>
    <GalleryExample title="상품 선택 카드" usage="카드 전체를 눌러 상품을 선택하거나 해제합니다. 체크 표시와 함께 상품의 게시 상태를 확인할 수 있습니다." source="관리자 · 홈 진열 섹션 수정">
      <FormChoice variant="row" id="gallery-commerce-selection" label="데일리 코튼 티셔츠" caption="아이보리 · 게시 중" checked={picked} onChange={event=>setPicked(event.target.checked)}/>
    </GalleryExample>
    <GalleryExample title="공장 작업 카드" usage="상품명과 내부 작업명으로 작업을 구별하고, 진행 상태를 확인한 뒤 상세를 엽니다." source="공장 · 대시보드의 진행할 시안">
      <details className={styles.task}><summary><strong>데일리 코튼 티셔츠</strong><span className={styles.note}>봄 샘플 02</span><span className={styles.taskMeta}><ValueStatus tone="info">샘플 작업 중</ValueStatus><span>시안 상세</span></span></summary><p>예시 작업 지시 · 소매 길이와 넥라인을 확인합니다.</p></details>
    </GalleryExample>
  </>;
}

export function ProductCardExample(){
  return (
    <GalleryExample title="고객 상품 카드" usage="상품 사진 아래에 이름, 판매 가격, 색상과 사이즈를 차례로 표시합니다." source="고객 · 홈 상품 컬렉션 / 상품 목록">
      <article className={styles.product}><svg viewBox="0 0 190 135" role="img" aria-label="아이보리 반팔 티셔츠 예시" className={styles.illustration}><path d="m69 21-21 9-23 32 20 13 12-14-1 54h78l-1-54 12 14 20-13-23-32-21-9q-26 16-52 0Z" fill="#e3d9c4" stroke="#736d61" strokeWidth="2"/><path d="M69 21q27 33 52 0M57 106h76" fill="none" stroke="#a89d86" strokeWidth="2"/></svg><h3>데일리 코튼 티셔츠</h3><ShopPrice pricing={discounted}/><ProductOptionPreview options={options}/></article>
    </GalleryExample>
  );
}

function Products(){
  return <>

    <GalleryExample title="정상가와 할인가" usage="정상 판매 상품은 판매 가격 하나를 표시합니다. 할인 상품은 기본가와 할인율, 최종 판매 가격을 함께 표시합니다." source="고객 · 상품 목록 / 상품 상세">
      <div className={styles.priceCompare}><div><h3>정상 판매</h3><ShopPrice pricing={regular}/></div><div><h3>할인 판매</h3><ShopPrice pricing={discounted}/></div></div>
    </GalleryExample>
    <GalleryExample title="색상·사이즈 조합" usage="상품에 등록된 색상과 사이즈를 중복 없이 요약합니다. 색상 이름은 색상 칩 옆에서 확인할 수 있습니다." source="고객 · 상품 목록의 옵션 미리보기">
      <ProductOptionPreview options={options}/>
    </GalleryExample>
  </>;
}

export function CommerceExamples({group}:{group:'버튼'|'카드'|'상품'}){
  if(group==='버튼')return <Buttons/>;
  if(group==='카드')return <Cards/>;
  return <Products/>;
}
