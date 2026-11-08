# WB229 반품·교환 접수 검증

- 검증일: 2026-11-07 / 담당: root, backend, web-contract / 독립 검증: claims_review
- 요구: R111. 설계 `docs/superpowers/specs/2026-11-07-claims-design.md`, 계약 `docs/contracts/order-claims.md`.
- 범위: 고객 목록·접수·상세, 관리자 목록·상세·별도 처리 화면, 주문 화면 연결. PG·택배 외부 호출 없음.

## 구현 및 경계

서버가 주문 소유권, 결제·배송 상태, 접수 잔여 수량, 동일 상품 교환 옵션, 상태 전이, 요청 멱등성과 버전 충돌을 검사한다. 접수→검토→수거 대기→회수→검수 완료→환불/교환 출고 대기로 구분한다. 교환 품절 시 고객 동의 후 반품 전환하며 이미 회수·검수한 단계는 보존한다. 회수 이후 철회할 수 없다. 접수만으로 재고·결제 원장은 변경하지 않는다.

첨부 사진은 최대 3장, 장당 2MiB PNG/JPEG이며 서버 재인코딩으로 메타데이터를 제거한다. 고객 본인과 관리자에게만 반환한다. 회수 주소는 주문 배송지에서 복사하고 수정할 수 있다. 법정 신청 기간을 임의의 고객 입력 날짜만으로 차단하지 않는다.

## 실행 결과

- API: `pytest tests/test_order_claims.py tests/test_sales_orders.py tests/test_order_reservations.py tests/test_customer.py -q` — 103 통과. 임시 DB 합성 주문 사용.
- 웹: `npm run typecheck`, `npm run lint`, `npm test` — 타입/lint 통과, 테스트 259 통과.
- 가이드/보드: `node --test tests/admin-guide*.test.ts tests/workboard*.test.ts` — 9 통과. 캡처 높이 1087→실제 1088 보정 후 재실행.
- PC1440·모바일390 Chrome: 반품/교환 신청, 사진 첨부, 422 입력 보존, 503 불명확 응답 동일 요청키 재시도, 성공 결과·포커스, 관리자 422/409 입력 보존 및 새 조회, 처리 이력, 사진/철회 모달 Escape·초점 복귀, 배경 위치 유지, 가로 넘침 없음.
- 브라우저 쓰기는 합성 API 응답으로 검증했다. 실제 로컬 관리자 BFF 조회 200 및 인증 가이드 이미지 로딩도 별도 확인했다. 실제 고객 주문/재고에는 쓰지 않았다.
- 독립 검증: API 접수 테스트 19, 웹 계약 테스트 9 통과; 최초 GET401 로그인 복귀 URL·폼 숨김 실제 Chrome 확인. 회수 이후 전환 상태 보존·철회 제한, 교환 대상 표시, 사진 모달, PC/모바일 캡처 검토.

## 가이드 및 화면 증거

가이드 ID `claims`, `sales-orders` 동기화. `claims:1`은 `apps/web/guide-assets/order-claims-detail.jpg`를 관리자 인증 경로로 제공한다. 클릭 표식은 접수 처리 버튼과 시각적으로 대조했다.

로컬 합성 화면 증거: `.local/wb229-customer-detail-390.png`, `.local/wb229-admin-detail-1440.png`, `.local/wb229-customer-success-1440.png`, `.local/wb229-exchange-customer-detail-390.png`, `.local/wb229-guide.png`. 재현 스크립트와 결과 JSON은 `.local/wb229-*`에 보관하며 커밋 대상에서 제외한다.

## 미실행·후속

실기기 터치/키보드, 운영 OAuth 세션, 실제 PG 환불·배송비 결제, 택배 수거·송장·교환 출고는 미실행이다. 외부 처리 완료를 수동으로 가장하는 기능은 없다. 배송비·환불액 확정 계산과 사진 보존/삭제 운영 정책, 외부 연동 후 재고 및 정산 처리는 후속 설계가 필요하다.

복구: 추가 라우트·UI 변경을 되돌릴 수 있다. 추가 원장 테이블은 기존 주문 데이터를 변경하지 않으므로 삭제하지 않고 보존한다. 이전 작업 WB228 변경은 유지했다.
