# WB143 / R111 주문 조회 구현 명세

사용자 승인: WB141 설계 기반 PG 제외 고객 주문내역 및 관리자 목록·상세 구현. 구현 root(웹/BFF/문서/통합), brand_backend(API/합성fixture/테스트), admin_sidebar_review(메뉴/호환/가이드), 별도 검증 customer_account_review.

1. catalog DB 추가 조회용 주문 스냅샷 테이블, 기존 DB 백업·호환, 고객 세션 소유권 및 관리자 인증을 분리. API 목록 cursor/status 및 상세 계약 확정. 테스트로401/404/조회격리·페이지 경계·금액 검증. 기존 checkout draft는 실주문으로 변환하지 않는다.
2. 공유 응답 parser·읽기전용 목록/상세 UI, 고객 `/account/orders`와 관리자 `/admin/orders`, 상세 `/[id]`를 연결. 목록/상세 별도 URL, 로딩/실패/빈목록/재조회·상태필터·다음페이지 제공. 읽기전용이므로 SaveResult 비적용, 결제/출고/취소 쓰기 동작 없음.
3. 고객 메뉴에서 주문내역/작성중 주문서를 구분. 관리자 메뉴는 새 orders항목을 기존 표시설정 보존하며 추가. 가이드 sales-orders 원문과 실제 합성캡처/표식 추가, start 캡처의 메뉴위치 재확인.
4. 별도 QADB/API8121/웹3121에 합성 주문만 준비. 실제 계정/실제 주문/실결제 미사용. PC/모바일 목록·상세·빈상태·권한·가이드 실제동작 검증 및 캡처. 제품 코드에 테스트 로그인이나 합성 데이터 자동시드 경로를 추가하지 않는다.
5. 디자인 시스템·API 계약·검증기록/보드 업데이트, 독립검증 후완료. 기존 미커밋 변경 보존. 복구는 신규 조회경로/메뉴 노출 제거, 추가테이블과 백업 보존; 기존 DB자료 삭제/운영배포/푸시 없음.

주요 파일: services/api/app/sales_orders.py, main.py, admin_navigation.py 및 관련테스트/seed스크립트; apps/web/src/lib/sales-orders.ts, customer-auth-core.ts, customer-shopping.ts, admin-menu.ts/admin-guide.ts, components/sales-orders.tsx/css, account/orders 및 admin orders 페이지/BFF. 담당자는 공유파일을 중복 편집하지 않는다.

수용: 고객A가B주문을조회할수없음, 비인증직접URL은정보미노출, 관리자권한서버검증, 주문 스냅샷에 현재상품/주소록 수정이전파되지않음, 금액합계/수량일관성, 모의주문표시, 미구현처리버튼없음, 모바일넘침없음. API/웹 자동테스트·타입/lint·실제브라우저·독립검토를 근거로기록. PG선정/주문상태변경/재고예약·환불은 제외.
