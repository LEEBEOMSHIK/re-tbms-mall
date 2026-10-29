# WB53 / R63 상품·재고 업무 분리

- 목적: 상품등록/옵션관리와 재고현황/입출고 업무의 탐색 및 화면책임 분리.
- 범위: 상품관리 /admin/catalog, 재고관리 /admin/catalog/inventory. 기존URL유지로 저장후링크/북마크 호환. 데이터/API/인증경계 변경없음.
- 담당: supplier_ui catalog-list/manager/css/inventory page+helper/tests, 조정 admin-navigation/dashboard/helper/tests/docs/workboard, supplier_review 독립검증.
- 계약: 메뉴는 상품/재고 배타적 활성, 공급처는 재고소속. 상품목록에는 별도 전체옵션재고표와 원장을 제거하고 상품별SKU합계/옵션수 및 product_id기반 재고보기. 수량변경은 재고업무로 이동. 옵션등록의 기존 초기입고는 기존합의 범위로 유지한다.
- 재고필터: 정확 product_id로 SKU/원장/요약카드 범위 제한. 현재상품과 전체보기 해제 명확. 잘못된ID는 명시안내, 전체재고로 오인시키지 않음. saved 쿼리 보존. 검색은 범위 내 추가필터.
- 검증: 복수상품 같은이름·옵션없음·재고0·보유합계·잘못된ID·필터전환·쿼리해제·새로고침·공급처메뉴·모바일. 독립 웹/lint/type/build, Edge 모의조회 데이터. 실제재고변경없음.
- 복구: 이번화면/메뉴/helper변경만 복원, DB변경/의존성 없음.
