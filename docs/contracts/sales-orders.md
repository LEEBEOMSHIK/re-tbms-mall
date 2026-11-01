# 판매 주문 조회 계약 (WB143)

- 요구: R111, 설계: `docs/superpowers/specs/2026-11-01-order-state-data-design.md`.
- GET `/api/customer/sales-orders`, `/{id}`: 인증 고객 본인 주문만 조회. 타인/없는 주문은 404. 관리자 GET `/api/admin/sales-orders`, `/{id}`는 관리자 인증 필수.
- 목록: `orders`, `next_cursor`; 상태 필터 `status`, 커서 `cursor`. API 기본 20건/최대 50건, 생성시각·ID 역순. 목록에 주소·연락처·고객 ID·PG 비밀값을 제공하지 않는다.
- WB145 관리자 추가 검색: `search_field`(all/number/product/recipient/phone), `q`(공백 제거 후 최대100자), `date_from`/`date_to`(YYYY-MM-DD, 한국시간 시작·종료일 포함), `payment_status`, `fulfillment_status`. 조건 간 AND, 전체 검색은 네 대상 OR. SQL 와일드카드는 일반 문자로 검색한다. 연락처는 하이픈/공백 차이를 정규화한다. 잘못된 날짜/역전/상태/조건이 다른 커서는 422. 관리자 커서는 검색어 원문 대신 전체 조건 해시와 결합한다. 고객 추가 필터는 아래 WB150 계약을 따른다.
- 상세: 주문/결제/배송 상태를 구분하고 상품명·옵션·수량·원화 정수 금액·배송지 사본, 발송 내역, 공개용 진행 이력을 반환한다. 현재 상품/주소록 수정과 독립적이다. 웹 파서는 허용 필드만 전달한다.
- 고객 `/account/orders`, 관리자 `/admin/orders`; 각각 `/{id}` 상세를 별도 화면으로 제공한다. 작성 중 주문서 `/orders`와 구매 주문을 구별한다.
- 조회 전용: 생성·승인·취소·환불·재고예약·출고 전이 API 없음. PG 선정 전 자동 주문 생성 없음. 실제 DB는 빈 목록이 정상이다.
- catalog DB에 `sales_order_schema` 버전 1과 주문/항목/배송지/발송/이력 테이블을 추가한다. 기존 catalog 버전은 유지하며 기존 DB에는 최초 확장 전 SQLite 백업을 만든다.
- 합성 시드: `scripts/seed_sales_order_demo.py --demo --catalog-path <새 파일.demo.sqlite3> --customer-id <합성 UUID>`. 기존 파일/일반 DB 이름은 거부. 모든 주문에 `is_demo=true`; 실제 환경에 자동 시드하지 않는다.
- WB144 사용자 명시 요청 예외: `scripts/seed_local_account_orders.py --local-demo --account-id-file <로컬 계정ID 파일>`은 기존 로컬 고객 계정에 합성 주문을 추가한다. 고정 `.local` DB·사전 백업·중복 보존·가상 배송지·is_demo 표시를 적용한다. 운영/자동 시드에는 사용하지 않는다.
- 복구: 변경 코드를 되돌리면 기존 상품/재고 기능을 유지할 수 있다. 추가 테이블은 보존하고 삭제 마이그레이션을 실행하지 않는다. DB 복원은 이후 업무 데이터와 대조 후 별도 진행한다.

- WB150 고객 목록은 `date_from`, `date_to`, `payment_status`, `fulfillment_status`를 추가 지원한다. 날짜 형식/한국시간 경계와 조건 해시 검증은 관리자와 동일, 수령인 검색은 제공하지 않는다. 상품명 검색은 WB154를 따른다. 항상 인증 customer_id 범위에 AND 적용한다. 추가 필터가 없으면 기존 status 커서 계약 유지, 추가 조건이 있으면 전체 조건 해시와 커서를 결합한다. 프록시는 허용된 조회 인자만 전달한다.

- WB154 고객 `q`는 주문 당시 상품명 부분검색 전용(다품목 중 하나 일치 시 해당 주문). 공백 정규화 후 최대100자, 특수문자는 일반문자로 검색. 기존 상태/기간과 AND, 검색어 해시를 커서에 포함한다. 고객 search_field 입력으로 다른 필드 검색을 확장하지 않는다.


## WB155 운영용 주문번호 내부 발급 계약
- 형식 `YYYYMMDD-XXXXXXXXXX`. 날짜는 최초 할당 시각의 한국시간, 뒤10자는 secrets 기반32자 알파벳(23456789ABCDEFGHJKLMNPQRSTUVWXYZ). 계정ID·개인정보·일별순번을 넣지 않는다. 번호는 불변 문자열이며 인증수단이 아니다.
- `SalesOrderStore.allocate_number(db, order_id, now=None)`를 주문 생성 서비스에서 호출한다. `with store.transaction() as db:`의 동일 연결로 번호 할당과 sales_orders/상품/배송 INSERT를 완료한다. 함수는 commit하지 않는다. `now` 주입은 테스트용이고 운영은 서버UTC시계를 사용한다.
- 신규 `sales_order_number_allocations(order_id PRIMARY KEY, public_number UNIQUE, allocated_at)`를 최초 할당 트랜잭션에서 추가한다. 기존 sales_order_schema/catalog 버전·기존 주문은 변경하지 않는다. 현재 읽기 전용 조회만으로 테이블을 만들지 않는다. DDL/할당은 실패시 함께 롤백된다. 이미 발급된 번호/할당 원장은 삭제하거나 재사용하지 않는다.
- 같은 주문UUID는 날짜가 바뀌거나 프로세스가 재시작되어도 같은 번호. 기존 주문번호(합성 포함)가 있으면 유지한다. 주문과 할당이 서로 다르면 오류로 중단. 랜덤충돌은 최대10회 재시도, 초과시 실패하고 호출 트랜잭션을 재시도한다. sales_orders.public_number UNIQUE도 유지한다.
- 운영 전제: 모든 웹/워커가 같은 영속 주문DB를 사용하고 BEGIN IMMEDIATE 쓰기 트랜잭션으로 호출한다. 현재 SQLite 계약이며 향후 다른 DB/복제구조 변경 시 구현·동시성 검증이 필요하다. 번호원장과 주문DB를 같이 백업/복구한다. 운영 적용 전 스토리지 백업 권장; 이 작업은 배포/실제DB 변경을 수행하지 않는다.
- 인증 고객ID·소유권/금액/재고 검증, 요청키→안정된 주문UUID 멱등매핑은 후속 주문 생성 서비스 책임. 매 재요청마다 새UUID를 만들면 같은 주문을 식별할 수 없으므로 금지. 번호만 외부에 발급하는 공개API는 만들지 않는다.
- 아직 주문 생성 서비스/PG가 없으므로 자동 발급 운영 경로는 미연결. 이 내부 함수는 운영 설정에서 모의번호로 전환하지 않는 실제 발급 구현이다. 합성 preview는 격리 임시DB에서만 사용.
- 검증 명령: `services/api/.venv/Scripts/python.exe scripts/preview_order_numbers.py` (3개 출력·동일UUID재시도 검증·임시DB 자동정리). 실제 주문 생성·결제 없음.
