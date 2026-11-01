/** Administrator help content is maintained here; update affected entries with feature changes. */
export type AdminGuide = {
  id: string; title: string; summary: string; updatedAt: string;
  prerequisites: string[];
  steps: {title: string; description: string; href?: string; linkLabel?: string}[];
  completion: string; notes: string[]; relatedPaths: string[];
};
export const ADMIN_GUIDES: AdminGuide[] = [
  {
    id:'start', title:'관리자 화면 처음 사용하기', summary:'로그인 후 메뉴를 찾고 화면 크기를 조정하는 순서입니다.', updatedAt:'2026-11-02',
    prerequisites:['관리자 로그인 권한이 필요합니다. 현재 관리자는 접근 키를 사용하는 세션 방식입니다.'],
    steps:[
      {title:'로그인하고 오늘의 현황 확인',description:'관리자 홈에서 현재 재고와 확인할 부족 옵션, 실제 발송·수령 업무를 살펴봅니다. 화면에 샘플이라고 표시된 구역은 실제 업무 집계와 구별합니다.',href:'/admin',linkLabel:'관리자 홈 열기'},
      {title:'왼쪽 그룹에서 업무 선택',description:'운영 그룹에서 상품·재고·주문 관리에 들어갈 수 있습니다. 그룹 제목으로 메뉴를 접고 펼칩니다. 들여쓴 하위 메뉴에서 업무를 선택하고, 강조된 메뉴로 현재 위치를 확인합니다. 작은 화면에서는 먼저 메뉴 열기를 누릅니다.'},
      {title:'보기 편한 글자와 테마 선택',description:'관리자 계정 옆 톱니바퀴에서 글자 크기와 테마를 선택합니다. 사이트의 크게·더 크게 설정은 Chrome 등의 브라우저 확대 배율과 별개로 적용됩니다.'},
    ],
    completion:'원하는 업무 화면이 열리고 현재 메뉴가 강조되어 있는지 확인합니다.',
    notes:['현재 사이트 브랜드는 RE:TAG입니다. 이전 업무 캡처에 RE: TBMS가 남아 있어도 메뉴와 업무 절차는 같습니다.','표시된 관리자 세션은 개인 이름·이메일 정보가 아닙니다.','작업을 마치면 왼쪽 하단 로그아웃을 사용합니다.'],
    relatedPaths:['apps/web/src/app/admin/admin-navigation.tsx','apps/web/src/components/site-settings-content.tsx','apps/web/src/components/text-size-control.tsx','apps/web/src/app/admin/(protected)/dashboard-view.tsx'],
  },
  {
    id:'sales-orders',title:'고객 주문 내역 확인하기',summary:'주문 목록을 상태별로 조회하고 주문 상세의 상품·금액·배송 정보·이력을 확인합니다.',updatedAt:'2026-11-01',
    prerequisites:['관리자 로그인 권한이 필요합니다. 조회할 주문이 등록되어 있어야 하며, 주문이 없으면 빈 목록이 표시됩니다.'],
    steps:[
      {title:'주문 목록 열기',description:'왼쪽 운영 그룹의 주문 관리를 엽니다. 목록에서 주문 상태와 금액을 확인합니다. 대기는 노랑·시계, 확인 필요는 주황·주의, 준비/배송은 파랑·상자/트럭, 완료는 초록·체크, 취소/만료는 회색·종료 아이콘으로 구분합니다. 색상과 상태 문구를 함께 확인합니다.',href:'/admin/orders',linkLabel:'주문 관리 열기'},
      {title:'조건으로 주문 검색',description:'검색 대상과 검색어는 바로 입력합니다. 검색어 오른쪽 슬라이더 모양의 상세 필터 아이콘을 눌러 주문일 시작·종료, 주문·결제·배송 상태를 펼친 뒤 검색을 누릅니다. 접어도 적용한 조건은 유지되고 아이콘의 숫자 배지에 적용 개수가 표시됩니다. 주문일은 한국 시간으로 양 끝 날짜를 포함합니다. 조건은 함께 적용되며 초기화하면 전체 목록으로 돌아갑니다. 빈 결과와 조회 실패 안내를 구분합니다.'},
      {title:'주문 상세 확인',description:'목록에서 주문을 선택해 별도 상세 화면으로 이동합니다. 주문 상품·옵션·수량과 금액, 등록된 배송 정보, 주문 이력을 대조한 뒤 목록으로 돌아갑니다.'},
    ],
    completion:'선택한 주문의 상태와 상품·금액·배송 정보·이력을 확인하고 목록으로 돌아왔는지 확인합니다.',
    notes:['테스트 주문 · 실제 결제 없음 표시가 있는 주문은 합성 검증 자료입니다. 번호 형식이 같아도 실제 결제·배송 주문이 아닙니다.','현재 주문 관리는 조회 전용입니다. 결제 승인·취소·환불·배송 처리 버튼은 제공하지 않습니다.','PG 연동이나 주문 상태 변경이 완료된 기능으로 해석하지 않습니다.','주문·배송 정보에는 개인정보가 포함될 수 있으므로 필요한 업무 범위에서만 확인합니다.'],
    relatedPaths:['apps/web/src/components/sales-orders.tsx','apps/web/src/lib/sales-orders.ts','apps/web/src/app/admin/(protected)/orders/page.tsx'],
  },
  {
    id:'catalog',title:'상품 등록부터 고객 화면 공개까지',summary:'상품을 등록하고 상세 화면에서 정보·이미지·옵션·가격을 준비한 뒤 공개합니다.',updatedAt:'2026-10-31',
    prerequisites:['상품명과 분류, 고객에게 보여줄 이미지·설명 및 판매할 색상·사이즈를 준비합니다.'],
    steps:[
      {title:'상품 등록',description:'상품 관리에서 상품 등록을 열어 기본정보를 입력하고 저장합니다. 이후 수정은 상품 목록에서 해당 상품의 상세 화면으로 들어갑니다.',href:'/admin/catalog',linkLabel:'상품 관리 열기'},
      {title:'기본정보와 고객용 이미지 준비',description:'상품 상세의 기본정보 탭에서 소개·소재·세탁 안내·사이즈 정보와 고객용 이미지를 관리합니다. 기본정보 저장과 이미지 작업의 완료 안내를 각각 확인합니다.'},
      {title:'색상·사이즈 등록',description:'색상칩은 색상명의 대표색이며 색상명과 함께 확인합니다. 사선 칩은 지정된 대표색이 없는 항목입니다. 색상·사이즈 탭에서 판매할 조합을 등록합니다. 사용 상태와 재고 부족 기준을 확인하고, 실제 보유 수량이 있다면 초기 입고 수량을 입력합니다.',href:'/admin/catalog/options/new',linkLabel:'색상·사이즈 등록 열기'},
      {title:'가격·할인·공개 설정 저장',description:'상품 상세의 가격·할인 탭에서 기본 판매 가격과 필요 시 할인 가격을 입력합니다. 할인 가격은 기본 가격보다 낮아야 합니다. 게시 전 확인할 항목을 해결한 뒤 상품 운영 상태를 게시로 저장합니다.'},
    ],
    completion:'서버 확정 저장 결과와 상품 운영 상태를 확인하고 쇼핑몰에서 상품 노출·가격·옵션을 확인합니다.',
    notes:['기본정보와 가격·할인·공개 설정은 별도로 저장합니다. 탭 이동만으로 입력이 저장되지는 않습니다.','고객용 이미지·사용 중 옵션·분류가 없으면 게시 설정이어도 고객 화면에서 제외될 수 있습니다. 재고 소진은 품절로 표시됩니다.','상품 공개는 실제 주문·결제 연동을 완료했다는 뜻이 아닙니다.'],
    relatedPaths:['apps/web/src/app/admin/(protected)/catalog/product-detail.tsx','apps/web/src/app/admin/(protected)/catalog/publication-editor.tsx','apps/web/src/app/admin/(protected)/catalog/catalog-forms.tsx','apps/web/src/app/admin/(protected)/catalog/product-images.tsx'],
  },
  {
    id:'inventory',title:'입고·출고·재고 조정하기',summary:'상품의 색상·사이즈별 실제 재고를 기록하고 변경 이력을 확인합니다.',updatedAt:'2026-10-31',
    prerequisites:['대상 상품의 색상·사이즈 옵션이 등록되어 있어야 합니다. 입고에는 사용 중인 공장·공급처가 필요합니다.'],
    steps:[
      {title:'현재 재고와 부족 옵션 확인',description:'재고 관리에서 색상칩과 색상명으로 옵션을 구별하고 실제 수량을 확인합니다. 부족 기준은 경고 표시 기준이며 실제 수량을 바꾸지 않습니다.',href:'/admin/catalog/inventory',linkLabel:'재고 관리 열기'},
      {title:'처리할 재고 업무 선택',description:'재고 기록 화면에서 입고·출고·조정을 구분합니다. 대상 상품·색상·사이즈, 수량과 해당 사유를 확인하고 입고라면 공장·공급처를 선택합니다.',href:'/admin/catalog/inventory/new',linkLabel:'재고 기록 열기'},
      {title:'기록 후 확정 수량 대조',description:'입고 기록·출고 기록·조정 기록을 실행하고 완료 안내에 나온 변경량과 실제 재고를 확인합니다. 이어서 재고 변경 이력에서 기록을 대조합니다.'},
    ],
    completion:'서버가 확정한 증감 수량과 변경 후 재고가 예상과 맞고 이력에 기록되어 있는지 확인합니다.',
    notes:['재고는 판매 의류의 색상·사이즈 조합(SKU) 기준입니다.','고객 판매 출고 기록은 주문·결제·배송 처리와 연결되지 않습니다.','저장 결과가 불확실할 때는 화면의 재시도 안내를 따릅니다. 새로고침하거나 나갔다면 변경 이력에서 저장 여부를 먼저 확인합니다.'],
    relatedPaths:['apps/web/src/app/admin/(protected)/catalog/catalog-forms.tsx','apps/web/src/app/admin/(protected)/catalog/catalog-manager.tsx','apps/web/src/lib/inventory-overview.ts'],
  },
  {
    id:'design',title:'의류 디자인 시안 만들고 저장하기',summary:'기본 의류를 선택해 시안을 만들고 편집한 뒤 저장된 결과를 확인합니다.',updatedAt:'2026-10-30',
    prerequisites:['시안 이름과 사용할 이미지 등 디자인 자료를 준비합니다.'],
    steps:[
      {title:'새 디자인 만들기',description:'의류 디자인 목록에서 새 디자인을 시작하고 이름과 기본 의류를 선택합니다. 생성 완료 후 편집 화면으로 이동합니다.',href:'/admin/designs',linkLabel:'의류 디자인 열기'},
      {title:'의류와 그래픽 편집',description:'편집 화면에서 의류·핏·사이즈와 나염 위치 등 제공되는 항목을 조정합니다. 미리보기로 배치를 확인하고 저장합니다.'},
      {title:'저장된 버전 확인',description:'저장 완료 안내의 버전을 확인하고 저장된 상세 화면을 다시 열어 결과를 검토합니다. 미리보기 연결이 끊기면 화면의 복구 안내를 따릅니다.'},
    ],
    completion:'편집 내용이 저장된 버전의 상세 화면에서 다시 보이는지 확인합니다.',
    notes:['시안 편집은 상품 옵션·가격·재고를 자동 변경하지 않습니다.','시안은 제작 전 검토용입니다. 실제 생산 치수·물성이나 생산용 출력의 확정을 대신하지 않습니다.','상세 조회 실패 안내와 저장 실패 안내를 구분합니다. 저장 완료 결과가 있다면 조회만 다시 시도합니다.'],
    relatedPaths:['apps/web/src/features/garment-designer/designer-pages.tsx','apps/web/src/features/garment-designer/studio-admin.tsx'],
  },
  {
    id:'factory',title:'공장 협업부터 수령·검수까지',summary:'담당 공장과 제작 진행을 확인하고 발송품을 수령·검수합니다.',updatedAt:'2026-10-30',
    prerequisites:['상품·색상·사이즈와 필요한 공장·공급처, 공장 계정 및 담당 공장 연결을 준비합니다.'],
    steps:[
      {title:'담당 공장과 진행 상태 확인',description:'공장 협업에서 상품별 진행 상태를 확인합니다. 상품별 담당 공장·시안 공유 설정과 공장 계정은 해당 관리 화면에서 별도로 확인합니다.',href:'/admin/factories',linkLabel:'공장 협업 열기'},
      {title:'추가 제작 요청 등록',description:'추가 제작이 필요하면 담당 공장과 색상·사이즈별 요청 수량, 요청 사항을 확인해 등록합니다. 제작 요청 수량은 현재 보유 재고와 별개입니다.',href:'/admin/factories/requests',linkLabel:'추가 제작 요청 열기'},
      {title:'발송 내역에서 수령 처리',description:'공장에 등록된 발송 내역을 열어 실제 도착한 대상과 수량을 확인한 뒤 수령을 처리합니다.',href:'/admin/shipments',linkLabel:'발송·수령 목록 열기'},
      {title:'검수 후 필요한 입고 확정',description:'수령한 발송품의 검수 화면에서 합격·불합격 결과를 기록합니다. 완제품은 상세 화면의 입고 확정 안내와 합격 수량을 확인해 처리합니다.'},
    ],
    completion:'발송 상세에 수령·검수 결과가 기록되고, 완제품 입고를 확정했다면 재고와 변경 이력에 반영됐는지 확인합니다.',
    notes:['제작 완료와 입고 완료는 다릅니다.','샘플과 완제품의 처리를 구별합니다. 샘플 검수만으로 판매 재고가 늘지는 않습니다.','이미 확정된 입고를 수동 입고로 다시 기록하지 않도록 이력을 확인합니다.'],
    relatedPaths:['apps/web/src/app/admin/(protected)/factories/factory-admin.tsx','apps/web/src/components/shipments/shipment-page.tsx','apps/web/src/components/product-progress.tsx'],
  },
  {
    id:'merchandising',title:'쇼핑몰 홈 진열 구성하기',summary:'홈에 표시할 섹션의 상품과 순서, 공개 여부를 관리합니다.',updatedAt:'2026-10-30',
    prerequisites:['고객에게 공개할 상품이 준비되어 있어야 합니다.'],
    steps:[
      {title:'홈 진열 목록 열기',description:'사이트 관리에서 홈 진열을 열어 현재 섹션과 순서를 확인합니다.',href:'/admin/site',linkLabel:'사이트 관리 열기'},
      {title:'섹션 등록 또는 수정',description:'진열 섹션을 등록하거나 기존 섹션의 수정을 열어 제목·상품·공개 여부·진열 순서를 설정합니다.',href:'/admin/merchandising',linkLabel:'홈 진열 관리 열기'},
      {title:'저장하고 고객 홈 확인',description:'저장 완료 안내의 대상과 위치를 확인한 뒤 목록과 고객 쇼핑몰에서 반영 결과를 확인합니다.'},
    ],
    completion:'저장된 섹션의 순서·공개 여부가 맞고 고객 홈에 의도한 상품이 표시되는지 확인합니다.',
    notes:['진열에 상품을 선택해도 상품 자체가 공개되는 것은 아닙니다. 게시 중인 상품만 고객 화면에 표시됩니다.','충돌 또는 저장 결과 불확실 안내가 나오면 최신 진열 확인 후 화면의 재저장 절차를 따릅니다.'],
    relatedPaths:['apps/web/src/app/admin/(protected)/merchandising/merchandising-list.tsx','apps/web/src/app/admin/(protected)/merchandising/merchandising-editor.tsx'],
  },
  {
    id:'brand',title:'브랜드 소개 편집하고 게시하기',summary:'소개 문구·브랜드 철학과 예시 이미지를 초안으로 저장한 뒤 미리보기하고 게시합니다.',updatedAt:'2026-11-02',
    prerequisites:['고객에게 보여줄 문구·이미지와 대체텍스트를 준비합니다.'],
    steps:[
      {title:'현재 소개 확인 후 편집',description:'브랜드 소개 관리에서 저장된 초안과 게시본 상태를 확인하고 편집 화면으로 이동합니다.',href:'/admin/brand-about',linkLabel:'브랜드 소개 관리 열기'},
      {title:'문구·이미지 수정 후 초안 저장',description:'소개 다음 브랜드 철학 제목·본문을 함께 입력합니다. 둘 다 비우면 철학 영역이 숨겨지며, 본문은 빈 줄로 문단을 구분합니다. 대표 이미지와 주제별 내용도 수정할 수 있습니다. 이미지 업로드만으로 소개 전체가 저장되지는 않으므로 초안 저장 완료까지 확인합니다.'},
      {title:'저장된 초안 미리보기',description:'미리보기에서 문구·사진·대체텍스트와 모바일 구성을 확인합니다. 이 단계는 고객 공개와 구분됩니다.',href:'/admin/brand-about/preview',linkLabel:'저장된 초안 미리보기'},
      {title:'저장된 초안 게시',description:'관리 상태 화면으로 돌아가 저장된 초안을 게시하고 확정 버전과 완료 안내를 확인합니다.'},
    ],
    completion:'고객 브랜드 소개에서 게시한 내용이 표시되는지 확인합니다.',
    notes:['초안 저장과 게시를 구분합니다. 초안 수정만으로 고객 공개본은 바뀌지 않습니다.','디자인 콘셉트 예시는 실제 판매 상품과 구별해 표시됩니다.'],
    relatedPaths:['apps/web/src/app/admin/(protected)/brand-about/brand-admin.tsx','apps/web/src/components/brand-about-view.tsx','services/api/app/brand_about.py'],
  },
  {
    id:'navigation',title:'관리자 메뉴 그룹과 표시 관리하기',summary:'그룹을 구성하고 메뉴 순서·표시 여부를 바꾸는 순서입니다.',updatedAt:'2026-11-01',
    prerequisites:['변경할 그룹과 메뉴 배치를 정합니다. 설정은 관리자 공통으로 적용됩니다.'],
    steps:[
      {title:'저장된 구성 확인',description:'사이트 관리 또는 왼쪽 하단 메뉴 관리에서 현재 그룹과 표시 상태를 확인합니다.',href:'/admin/navigation',linkLabel:'메뉴 관리 열기'},
      {title:'메뉴 구성 편집',description:'그룹 이름·순서를 바꾸고, 메뉴의 소속 그룹·순서·표시를 설정합니다. 빈 그룹만 삭제할 수 있습니다. 기본 구성 불러오기는 입력만 바꾸며 아직 저장하지 않습니다.',href:'/admin/navigation/edit',linkLabel:'메뉴 구성 편집 열기'},
      {title:'저장 결과와 사이드바 확인',description:'메뉴 구성 저장을 누른 뒤 확정 버전·그룹 수·표시 메뉴 수와 왼쪽 사이드바를 확인합니다.'},
    ],
    completion:'의도한 순서와 표시 상태가 저장되었고 왼쪽 메뉴에 반영되는지 확인합니다.',
    notes:['그룹을 숨기면 그 안의 메뉴도 숨겨집니다. 보이는 메뉴가 없는 그룹은 표시되지 않습니다.','메뉴 숨김은 접근 권한 차단이 아닙니다. 직접 URL은 기존 관리자 인증을 따릅니다.','메뉴 관리와 사용 가이드는 숨김 설정 밖에 있어 전체 메뉴를 숨겨도 복구 안내에 접근할 수 있습니다.','충돌이 나면 입력을 유지한 채 최신 저장본을 확인하고, 명시적으로 현재 입력을 최신 버전 기준으로 저장 준비한 뒤 다시 저장합니다.'],
    relatedPaths:['apps/web/src/app/admin/(protected)/navigation/menu-manager.tsx','apps/web/src/app/admin/admin-navigation.tsx','apps/web/src/lib/admin-menu.ts','services/api/app/admin_navigation.py'],
  },
  {
    id:'reviews',title:'리뷰 공개 상태와 답변 관리하기',summary:'리뷰를 확인하고 사유와 함께 숨김·복원 또는 답변을 저장합니다.',updatedAt:'2026-10-30',
    prerequisites:['대상 상품과 리뷰 내용을 먼저 확인합니다.'],
    steps:[
      {title:'리뷰 찾기',description:'리뷰 관리에서 상품·리뷰 검색과 공개 상태 필터로 대상을 찾은 뒤 상세 보기를 엽니다.',href:'/admin/reviews',linkLabel:'리뷰 관리 열기'},
      {title:'공개 상태·답변 수정',description:'상세에서 수정 화면으로 이동해 공개 상태나 고객에게 보여줄 답변을 입력합니다. 처리 사유는 필수이며 내부 기록용입니다.'},
      {title:'저장 후 결과와 이력 확인',description:'리뷰 관리 저장을 누르고 목록의 완료 안내를 확인합니다. 상세에서 공개 상태·답변·관리 이력을 대조합니다.'},
    ],
    completion:'의도한 공개 상태와 답변이 저장되고 변경 사유가 관리 이력에 남았는지 확인합니다.',
    notes:['관리자는 고객의 리뷰 내용과 평점을 변경하지 않습니다.','삭제된 리뷰는 수정할 수 없습니다. 처리 사유는 고객 화면에 표시되지 않습니다.'],
    relatedPaths:['apps/web/src/app/admin/(protected)/reviews/review-pages.tsx'],
  },
  {
    id:'recovery',title:'저장 오류·조회 실패·작업 상태 확인하기',summary:'완료 여부가 불명확할 때 중복 작업을 피하고 현재 상태를 확인합니다.',updatedAt:'2026-10-30',
    prerequisites:['현재 화면의 완료 안내와 오류 문구를 먼저 읽습니다.'],
    steps:[
      {title:'저장 결과와 조회 오류 구분',description:'저장 완료와 확정 버전·수량이 이미 표시되었다면, 이후 목록이나 요약을 불러오지 못한 것만으로 같은 내용을 다시 저장하지 않습니다. 해당 조회 재시도를 사용합니다.'},
      {title:'충돌·통신 실패 안내 따르기',description:'입력이 남아 있다면 보존한 채 화면의 최신 상태 조회·입력 유지 또는 재시도 안내를 따릅니다. 새로고침·화면 이동 전 필요한 입력을 확인하고, 재진입한 경우 저장된 상세·이력부터 확인합니다.'},
      {title:'프로젝트 작업 상태 확인',description:'작업 보드에서 진행 중·다음 제안·결정할 일·완료 항목과 검증 근거를 확인합니다. 변경 요청은 업무 맥락과 함께 전달합니다.',href:'/admin/workboard',linkLabel:'작업 보드 열기'},
    ],
    completion:'저장된 상태와 미처리 입력을 구분한 뒤 필요한 조회 또는 편집을 이어갑니다.',
    notes:['작업 보드는 저장소 문서를 보여주는 읽기 전용 화면이며 자동 에이전트 상태 추적 화면이 아닙니다.','실결제·환불·주문 처리나 미확정 판매·배송 정책을 이 가이드의 재고 절차로 대신하지 않습니다.','기능·메뉴·진행 순서 변경 작업에는 관련 가이드 검토와 갱신도 포함됩니다.'],
    relatedPaths:['apps/web/src/components/ui/save-result.tsx','apps/web/src/app/admin/(protected)/workboard/page.tsx','apps/web/src/lib/admin-guide.ts'],
  },
  {id:'pg-preparation',title:'PG 견적 문의 준비하기',summary:'문의문과 준비정보를 확인하고 견적 비교 후 결제대행사를 선정합니다.',updatedAt:'2026-10-30',
   prerequisites:['사업자 상태, 예상 판매규모와 판매·발송 방식을 확인합니다. 미정인 항목은 미정으로 남깁니다.'],
   steps:[{title:'PG 도입 준비 열기',description:'프로젝트 그룹의 PG 도입 준비 메뉴에서 문의문·업체별 추가 문장·준비정보를 확인합니다. 메뉴가 숨겨져 있으면 메뉴 관리에서 표시합니다.',href:'/admin/payment-preparation',linkLabel:'PG 도입 준비 열기'},{title:'문의문 복사 후 작성',description:'문의문 복사를 누르고 복사 완료 안내를 확인합니다. 실패하면 선택된 원문을 직접 복사합니다. 외부 문서에 붙여넣어 빈칸을 채우고 해당 업체의 추가 요청 문장을 덧붙입니다.'},{title:'견적 비교 후 선정',description:'PG 도입 준비의 업체별 결제수단에서 일반 결제·간편결제·신청 조건과 공식 출처를 확인합니다. 지원 안내는 현재 쇼핑몰 연동 완료를 뜻하지 않습니다. 결제수단별 요율·총비용·정산·보증·환불·해지 조건을 같은 기준으로 비교합니다. 진행 상태는 작업 보드에서 확인합니다.',href:'/admin/workboard',linkLabel:'작업 보드 열기'}],
   completion:'문의문과 준비정보를 확인하고 실제 견적을 비교할 기준을 마련했는지 확인합니다. 화면에서 문의가 자동 발송되지는 않습니다.',
   notes:['카카오 로그인과 카카오페이 결제는 별개입니다.','이 화면은 읽기 전용이며 입력정보·견적서를 저장하지 않습니다. 실제 선정·계약·결제는 별도 단계입니다.'],
   relatedPaths:['apps/web/src/lib/payment-preparation.ts','apps/web/src/app/admin/(protected)/payment-preparation/preparation-view.tsx','apps/web/src/lib/admin-menu.ts']},
];
