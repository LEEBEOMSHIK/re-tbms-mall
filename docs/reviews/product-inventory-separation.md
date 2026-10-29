# WB53 / R63 상품·재고 분리 검증

- 구현: supplier_ui 카탈로그/재고 목록·필터, 조정 전역메뉴/대시보드/문서. 독립: supplier_review.
- 변경: admin-navigation.tsx, dashboard-view.tsx, lib/admin-navigation.ts+test, catalog-list/manager/css, inventory/page, lib/inventory-summary.ts+test. 기존 경로 유지, 공급처 재고소속, 상품목록 전체재고표/원장 제거. 실제SKU합계/개수와 product_id 재고보기. 상품범위표시/해제/잘못된값 안내.
- Edge .local/product-inventory-separation-browser.cjs 통과: 메뉴 활성배타성 및 공급처소속, 상품목록 합계4/99/0, 같은이름 상품간 정확ID분리(2SKU/1원장), 상품범위카드4개, 새로고침/전체보기해제, 없는상품/빈필터/중복쿼리 안전안내, 옵션없는상품0, saved 다른상품기록 미표시/범위해제후 saved 보존·확인.
- 상품/재고2화면×1440/768/390×라이트/다크 확대글꼴12조합 문서 가로넘침없음/활성메뉴1개. .local/product-inventory-separation.png 모바일다크 렌더링 확인.
- 합성조회만 사용. 실제재고변경없음. 별도권한경계나 서버필터 추가는 아님(기존 공용관리자 접근 유지).
- 독립 웹69개·lint(경고0)·typecheck·production build 모두 exit0. 차단결함 없음.
- API/DB 변경없어 API 재실행미수행. 기존 옵션등록 초기입고는 기존합의 유지, 일상입출고는 재고관리.
- 복구: 이번메뉴/화면/helper변경만 되돌리며 다른미커밋작업보존. 새 의존성 없음.
