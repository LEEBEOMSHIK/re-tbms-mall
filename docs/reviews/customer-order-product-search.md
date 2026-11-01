# WB154 고객 주문 상품명 검색
- R111 / root 구현·customer_account_review 독립검증 / 2026-11-01.
- 목적: 고객이 본인이 주문한 상품명으로 주문을 찾는다. 기존 기간/상태 AND 조건 유지.
- 파일: customer-order-search.tsx, sales-orders.css, customer-auth-core.ts, sales_orders.py, test_sales_orders.py, 계약·디자인시스템·보드.
- 계약: q 정규화100자, product 필드 고정, 본인범위, literal검색, 검색어변경 커서422. DB/PG/번호 수정 없음.
- 번호 확인: seed_local_account_orders.py의 LOCAL-DEMO + 계정ID 앞8자리 + 합성 순번4자리. 실주문 생성/운영번호 발급은 미구현. 계정ID를 제외한 날짜+고유번호는 제안이며 확정으로 기록하지 않는다.
- 검증: 타입/대상 ESLint 통과, 독립 API28·웹6 통과/차단없음. 실제3100 없는상품→빈결과, 그래픽+상품준비중→1건. PC/모바일390 캡처, 넘침false.
- 캡처 .local/wb154-pc.png, .local/wb154-mobile.png. 합성주문 사용. 서버8100 해당 프로젝트만 동일명령/설정으로 재시작.
- 관리자 가이드 영향 없음(고객 검색만 변경), 저장 UI 해당 없음. 새 의존성 없음. 복구는 이번 검색 코드만 되돌림.

- 초기화 후 검색어 빈값·전체6건 복귀 확인. IAB viewport 복원 및 검증탭 닫음.
