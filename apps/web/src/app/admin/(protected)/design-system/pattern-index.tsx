import Link from 'next/link';
import styles from './gallery.module.css';

const groups = [
  { title: '공통 컴포넌트와 표시 환경', patterns: [
    { name: '입력 레이블·필수 표시·선택 상자', usage: '상품·공급처·진열 입력에서 필수 안내와 체크·라디오·선택 항목을 구성한다.', href: '/admin/merchandising',
      sources: ['components/ui/form-controls.tsx'] },
    { name: '색상칩·상태 배지·핵심 수치', usage: '상품 옵션 색상, 진행 상태, 현재값과 변경값을 구별한다.', href: '/admin/catalog',
      sources: ['components/ui/color-chip.tsx', 'components/ui/status-badge.tsx', 'components/ui/key-facts.tsx'] },
    { name: '목록 페이지 이동·줄무늬 표', usage: '관리 목록에서 표시 범위, 이전·다음 페이지, 행과 헤더를 구분한다.', href: '/admin/catalog/suppliers',
      sources: ['components/ui/list-pagination.tsx', 'components/ui/management-lists.css'] },
    { name: '완료 패널·도움말', usage: '저장 완료 후 확정값과 후속 동작, 용어 도움말을 제공한다. 갤러리에서 합성 예시를 확인할 수 있다.', href: '/admin/design-system',
      sources: ['components/ui/save-result.tsx', 'components/ui/tooltip.tsx'] },
    { name: '화면 설정·역할별 로그인 이동', usage: '테마·글자 크기와 관리자·공장 로그인 화면 사이의 이동을 제공한다.', href: '/admin/login',
      sources: ['app/globals.css', 'components/site-settings.tsx', 'components/site-settings-content.tsx', 'components/theme-control.tsx', 'components/text-size-control.tsx', 'components/ui/login-navigation.tsx'] },
  ] },
  { title: '고객 쇼핑과 계정', patterns: [
    { name: '매장 헤더·모바일 메뉴·푸터', usage: '고객 메뉴, 로그인 상태, 장바구니 링크, 정책 링크와 브랜드 로고를 표시한다.', href: '/',
      sources: ['components/shop-shell.tsx', 'components/customer-mobile-nav.tsx', 'components/customer-nav-link.tsx', 'components/customer-cart-link.tsx', 'components/brand-logo.tsx', 'components/footer.css'] },
    { name: '홈 컬렉션·상품 카드', usage: '진열 컬렉션의 슬라이드, 상품 가격·할인·옵션·평점을 표시한다. 게시된 상품과 섹션에 따라 내용이 달라진다.', href: '/',
      sources: ['components/storefront-view.tsx', 'components/product-carousel.tsx', 'components/shop-price.tsx', 'components/product-option-preview.tsx', 'components/review-rating.tsx'] },
    { name: '상품 탐색·상세·리뷰', usage: '목록의 필터·정렬·페이지 이동, 상세 이미지·옵션·상품 설명·리뷰를 제공한다. 게시된 상품을 선택해 상세를 연다.', href: '/products',
      sources: ['components/shop-products.tsx', 'components/shop-product-detail.tsx', 'components/product-details-view.tsx', 'components/product-reviews.tsx', 'components/customer-add-to-cart.tsx'] },
    { name: '브랜드 소개·정책 본문', usage: '공개 브랜드 소개와 푸터에서 진입하는 정책 본문을 표시한다.', href: '/about',
      sources: ['components/brand-about-view.tsx', 'app/policies/[slug]/page.tsx'] },
    { name: '고객 로그인·세션·장바구니', usage: '로그인과 장바구니 수량·품절 상태. 본인 계정이 필요하며 소셜 로그인은 외부 공급자를 이용한다.', href: '/cart',
      sources: ['components/customer-login.tsx', 'components/customer-session.tsx', 'components/customer-cart.tsx'] },
    { name: '프로필·주소록·배송 필드', usage: '계정 요약·기본 배송지·주소 입력 및 우편번호 검색. 계정 데이터와 주소 검색 서비스가 필요하다.', href: '/account',
      sources: ['components/customer-account.tsx', 'components/customer-shipping-fields.tsx', 'components/korean-address-search.tsx'] },
    { name: '주문서·배송 조건·합계', usage: '주문서 합성 미리보기를 연다. 실제 초안·배송 조건·결제 시작 버튼은 로그인과 본인 주문서가 필요하다.', href: '/checkout/preview',
      sources: ['app/checkout/preview/preview.tsx', 'components/live-checkout.tsx'] },
    { name: '내 주문서 목록', usage: '로그인한 고객이 저장한 주문서 초안을 열람한다. 구매 내역은 계정의 주문 목록에서 따로 조회한다.', href: '/orders',
      sources: ['app/orders/page.tsx', 'components/live-checkout.tsx'] },
    { name: '주문 검색·상세·재고 확보·취소', usage: '본인 주문 목록에서 상세를 선택한다. 확보 기한, 만료 및 취소 가능 여부는 서버 응답에 따른다.', href: '/account/orders',
      sources: ['components/customer-order-search.tsx', 'components/sales-orders.tsx', 'components/order-status-badge.tsx', 'components/reservation-notice.tsx', 'components/order-cancellation.tsx'] },
  ] },
  { title: '관리자 상품·재고·주문', patterns: [
    { name: '운영 홈·재고 요약', usage: '관리자 대시보드의 수치·상태와 SKU 보유 수량을 표시한다.', href: '/admin',
      sources: ['app/admin/(protected)/dashboard-view.tsx', 'app/admin/(protected)/inventory-overview.tsx'] },
    { name: '상품 목록·정보 탭·입력 폼', usage: '상품 목록에서 상세 탭·수정 화면으로 이동한다. 상품과 SKU 조합, 상세 항목 입력은 권한과 데이터가 필요하다.', href: '/admin/catalog',
      sources: ['app/admin/(protected)/catalog/catalog-manager.tsx', 'app/admin/(protected)/catalog/catalog-list.tsx', 'app/admin/(protected)/catalog/product-detail.tsx', 'app/admin/(protected)/catalog/catalog-forms.tsx', 'app/admin/(protected)/catalog/product-details-fields.tsx'] },
    { name: '카테고리·옵션값', usage: '트리 구조, 사용 여부, 색상·사이즈 옵션을 관리한다. 카테고리와 옵션값은 각각 별도 목록이다.', href: '/admin/catalog/categories',
      sources: ['app/admin/(protected)/catalog/category-manager.tsx', 'app/admin/(protected)/catalog/option-value-manager.tsx', 'app/admin/(protected)/catalog/option-value-form.tsx'] },
    { name: '판매가·공개 조건·이미지', usage: '상품 상세에서 가격, 게시 상태와 사유, 이미지 종류·등록 상태를 본다. 데이터가 없으면 목록이 비어 있다.', href: '/admin/catalog',
      sources: ['app/admin/(protected)/catalog/product-price.tsx', 'app/admin/(protected)/catalog/product-images.tsx', 'app/admin/(protected)/catalog/publication-editor.tsx', 'app/admin/(protected)/catalog/publication-notice.tsx'] },
    { name: '재고 조정·안전 재고·공급처 주소', usage: 'SKU별 입출고와 경고 수량, 공급처별 주소 입력을 사용한다.', href: '/admin/catalog/inventory',
      sources: ['app/admin/(protected)/catalog/reorder-point-editor.tsx', 'app/admin/(protected)/catalog/catalog-forms.tsx', 'app/admin/(protected)/catalog/suppliers/supplier-manager.tsx', 'app/admin/(protected)/catalog/suppliers/supplier-address.tsx'] },
    { name: '주문 검색·배송 상태', usage: '관리자 주문 목록은 주문·결제·출고 조건을 표시한다. 개별 주문을 선택하면 스냅샷과 상태 이력을 확인할 수 있다.', href: '/admin/orders',
      sources: ['components/admin-order-search.tsx', 'components/sales-orders.tsx'] },
    { name: '리뷰 목록·검토', usage: '관리자 리뷰 목록에서 개별 기록을 선택하면 상태와 검토 화면을 확인할 수 있다.', href: '/admin/reviews',
      sources: ['app/admin/(protected)/reviews/review-pages.tsx'] },
    { name: '발송 수령·검수', usage: '발송 목록의 실제 건을 선택하고 수령 및 검수 상태를 확인한다. 상태 전이는 해당 권한과 선행 단계가 필요하다.', href: '/admin/shipments',
      sources: ['components/shipments/shipment-page.tsx'] },
  ] },
  { title: '관리자 사이트·제작·프로젝트', patterns: [
    { name: '관리자 로그인·세션 만료', usage: '관리자 로그인 폼과 보호 화면의 세션 확인·만료 안내를 사용한다. 세션 만료는 현재 세션의 인증 결과에 따라 나타난다.', href: '/admin/login',
      sources: ['app/admin/login/login-form.tsx', 'app/admin/admin-session-guard.tsx'] },
    { name: '사이드바·그룹 배치·표시 제어', usage: '사이드바 폭, 그룹 접기, 메뉴 설정 현황과 편집을 제공한다.', href: '/admin/navigation',
      sources: ['app/admin/admin-navigation.tsx', 'app/admin/sidebar-width.tsx', 'app/admin/(protected)/navigation/menu-manager.tsx'] },
    { name: '브랜드 소개·자료실·홈 진열', usage: '사이트 관리에서 소개, 브랜드 자료 초안·미리보기·게시, 홈 진열 섹션 순서·공개 여부 화면으로 진입한다.', href: '/admin/site',
      sources: ['app/admin/(protected)/brand-about/brand-admin.tsx', 'components/brand-library-manager.tsx', 'components/brand-library.tsx', 'app/admin/(protected)/merchandising/merchandising-list.tsx', 'app/admin/(protected)/merchandising/merchandising-editor.tsx'] },
    { name: '공장 계정·제작 요청·진행', usage: '관리자 인증 후 공장 목록·계정, 제작 요청과 진행 상세를 확인한다.', href: '/admin/factories',
      sources: ['app/admin/(protected)/factories/factory-admin.tsx', 'app/admin/(protected)/factories/factory-nav.tsx', 'app/admin/(protected)/factories/progress/admin-progress.tsx', 'components/product-progress.tsx'] },
    { name: '의류 시안 스튜디오', usage: '시안 목록에서 편집기와 3D 미리보기를 연다. 편집·재질·모델 렌더링은 시안 데이터와 브라우저 그래픽 지원에 따라 달라진다.', href: '/admin/designs',
      sources: ['features/garment-designer/designer-pages.tsx', 'features/garment-designer/designer-editor.tsx', 'features/garment-designer/studio-admin.tsx', 'features/garment-designer/material-info.tsx', 'features/garment-designer/preview-3d.tsx'] },
    { name: '사용 가이드·화면 캡처 확대', usage: '업무별 가이드와 인증된 화면 캡처의 단계별 표식·확대 기능을 확인한다.', href: '/admin/guide',
      sources: ['app/admin/(protected)/guide/guide-view.tsx', 'app/admin/(protected)/guide/guide-capture.tsx'] },
    { name: '작업 보드·결제 및 택배사 준비', usage: '프로젝트 메뉴에서 상태별 작업 보드와 PG·택배사 준비 정보를 확인한다.', href: '/admin/workboard',
      sources: ['app/admin/(protected)/workboard/workboard-column.tsx', 'app/admin/(protected)/payment-preparation/preparation-view.tsx', 'app/admin/(protected)/carrier-preparation/carrier-preparation.tsx'] },
  ] },
  { title: '공장 포털', patterns: [
    { name: '공장 로그인·메뉴·대시보드', usage: '공장 전용 계정으로 로그인하면 권한에 맞는 메뉴와 진행 요약이 표시된다.', href: '/factory',
      sources: ['app/factory/factory-login.tsx', 'app/factory/factory-shell.tsx', 'app/factory/factory-navigation.tsx', 'app/factory/factory-dashboard.tsx'] },
    { name: '담당 상품·제작 요청·진행 입력', usage: '배정된 상품과 요청을 목록에서 선택해 진행 상태와 수정 화면으로 이동한다.', href: '/factory/products',
      sources: ['app/factory/factory-workspace.tsx', 'app/factory/factory-progress-page.tsx', 'components/product-progress.tsx'] },
    { name: '공장 발송·프로필·브랜드 자료', usage: '공장 메뉴에서 발송 기록, 내 프로필, 게시된 자료를 열람한다. 발송 등록에는 해당 상품과 수량이 필요하다.', href: '/factory/shipments',
      sources: ['components/shipments/shipment-page.tsx', 'app/factory/factory-profile-edit.tsx', 'components/brand-library.tsx'] },
  ] },
];

export function PatternIndex() {
  return <section className={styles.index} aria-labelledby="pattern-index-heading">
    <header><h2 id="pattern-index-heading">사용처 색인</h2><p>업무를 펼치면 실제 사용 화면과 원본 파일을 확인할 수 있습니다. 로그인이나 개별 기록이 필요한 화면은 해당 목록에서 시작합니다.</p></header>
    {groups.map(group => <details className={styles.example} key={group.title}>
      <summary className={styles.sample}>{group.title} ({group.patterns.length})</summary>
      <div className={styles.sample}><ul className={styles.stack}>
        {group.patterns.map(pattern => <li key={pattern.name}>
          <h3>{pattern.name}</h3><p>{pattern.usage}</p>
          <Link href={pattern.href} prefetch={false}>{pattern.name} 열람 경로</Link>
          <details><summary>원본 파일 {pattern.sources.length}개</summary>
            <ul>{pattern.sources.map(path => <li key={path}><code style={{overflowWrap: 'anywhere'}}>apps/web/src/{path}</code></li>)}</ul>
          </details>
        </li>)}
      </ul></div>
    </details>)}
  </section>;
}
