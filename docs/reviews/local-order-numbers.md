# WB156 로컬 테스트 주문번호
- R111 / root / 2026-11-01. 사용자 승인: 기존 로컬 테스트 주문에 운영형 번호 적용, 테스트임을 명확히 표시.
- 범위: migrate_local_order_numbers.py, seed_local_account_orders.py(재실행 중복 방지), sales-orders.tsx 문구, 결정/요구/디자인/보드.
- 계약: 고정 .local/catalog.sqlite3, explicit --local-demo, 지정 계정+is_demo+LOCAL-DEMO prefix만. 백업 후 동일트랜잭션으로 번호/할당원장 연결. UUID·계정·금액·상태·상품·배송·재고 보존. 운영 allocator의 기존번호 유지 계약은 변경하지 않는다.
- 수용: 독립 격리시험·멱등성·다른데이터 보존·실제고객목록 캡처. 번호는 주문의 기존 created_at KST 날짜를 사용하며 테스트여부는 is_demo로 명시.
- 복구: catalog.pre-demo-renumber-*.bak 보존. 이후업무자료를 지우는 전체복원 금지, 백업번호와해당UUID를 대조하여 필요한행만 복구. 할당원장 함께 조정 필요. 스크립트는 운영에서 사용하지 않는다.
- 가이드: 관리자 목록에도 같은 테스트문구 변경, sales-orders 원문에 테스트표시 의미 동기화 필요. 저장 UI 해당없음.

## 실행 결과
- 독립 격리검증: 대상6건만 변경·타계정/실주문보존·반복마이그레이션/시드 동일·백업생성·재고보존 확인.
- 실제 실행6건 변경. 백업 .local/catalog.pre-demo-renumber-52643f14-7d8f-41cd-a4f1-14f3f936435c.bak. 기존30개 테이블을 번호열 제외 양방향EXCEPT 비교 동일 확인.
- 타입 검사·웹/가이드8 통과. 실제고객6개 새번호/테스트표시·상세 안내 확인, 관리자6건 동일 반영 확인. 캡처 .local/wb156-customer.png, wb156-admin.png, wb156-admin-detail.png.
- 가이드 sales-orders 원문·목록/검색/상세 실제캡처와 표식 갱신. 모바일 전용 재검증 미실행(기존공통구조 유지).
