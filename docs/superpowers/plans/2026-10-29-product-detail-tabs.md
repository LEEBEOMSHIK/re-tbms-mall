# WB96 / R101 상품 상세 선택 탭

사용자 요청: 스크린샷의 기본정보·가격/할인·색상/사이즈·재고·리뷰 버튼에 활성 상태를 표시하고 선택한 수정 화면만 아래에 표시한다.

- 담당: root 구현·통합, 독립 검증 별도. 기존 WB95 미커밋 변경 보존.
- 범위: product-detail.tsx, catalog.css, reviews/review-pages.tsx의 임베드 모드, 문서.
- 계약: API/DB 변경 없음. 기존 기본정보/가격 저장 구역 재사용. 숨김 패널은 unmount하지 않아 초안·완료 결과 보존. 고객 이미지는 기본정보에 포함. 리뷰는 현재 상품 목록을 패널에 표시하고 개별 처리 화면 유지.
- 활성 탭은 action/on-action 토큰과 굵기·밑줄로 구분. ARIA tablist/tab/tabpanel, roving tabindex, 좌우/Home/End 키 지원.
- URL hash product-basic/pricing/options/stock/reviews로 선택 유지. 기존 edit 리다이렉트·상단 가격 바로가기 같은 선택 경로 사용. 모르는 hash는 기본정보. 탭 클릭은 스크롤 점프 없이 현재 화면 유지.
- 수용: 5개 탭 중 한 패널만 표시, 선택·키보드·딥링크 일치, 왕복 초안 및 저장 결과 보존, 리뷰 상품 범위, main 중첩 없음, 390px/다크/확대 가로 넘침 없음.
- 검증: 구현 전 브라우저 tab 부재 실패 → 구현 후 선택·폼 보존·저장/딥링크/키보드/모바일 브라우저 테스트, 웹160/type/lint, 독립 diff 및 실행 검토.
- 복구: WB96 해당 diff만 되돌리고 이전 WB95 및 next-env.d.ts 변경 보존. 커밋/푸시/실제 상품 저장 없음.
