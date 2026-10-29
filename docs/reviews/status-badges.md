# 상태 아이콘 배지 검증

2026-10-26 / WB28 / R38
계획: docs/superpowers/plans/2026-10-26-status-badges.md

조정 담당이 공통 StatusBadge와 상태 색상 토큰을 추가하고 상품 준비 상태/미게시 표시를 교체했다. 옵션 등록/입고/일부재고/준비됨/미게시/미확인 각각 아이콘과라벨을 유지한다. inventory_review가 비대화형span·장식SVG·상태값보존·강제색상우선순위를 독립 검토하고 lint·타입검사 exit0을 확인했다.

Edge .local/product-readiness-ui.cjs exit0. 4상태와별도미게시, 기본계약/소진갱신/미확인fallback,320/390px넘침과중앙정렬을 확인했다. 8개배지SVG의aria-hidden, 강제색상에서라벨/아이콘표시유지를 확인하고4행목록캡처를 직접 검토했다. 서버 데이터 변경없음. API규칙변경이없는시각수정이므로 전체테스트/빌드는반복하지않았다. 복구는공통배지·소비UI·문서변경을되돌린다.
