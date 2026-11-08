# WB229 / R111 반품·교환 API 계약

기준: `docs/superpowers/specs/2026-11-07-claims-design.md`. 개인정보는 인증된 상세·컨텍스트에서만 제공한다. 모든 응답은 `Cache-Control: no-store`. 고객 Bearer와 관리자 Bearer는 서로 대체할 수 없다.

## 경로

| 역할 | 메서드·경로 | 결과 |
|---|---|---|
| 고객 | GET `/api/v1/customer/claim-context/{order_id}` | Context |
| 고객 | GET/POST `/api/v1/customer/claims` | 목록 / 신규 Detail(201) |
| 고객 | GET/POST `/api/v1/customer/claims/{id}` | Detail / 행동 결과 Detail |
| 관리자 | GET `/api/v1/admin/claims` | 목록 |
| 관리자 | GET/POST `/api/v1/admin/claims/{id}` | Detail / 행동 결과 Detail |

목록 query: `order_id?`, `status?`, `limit=20`(1..50), `cursor?`. 결과 `{claims:Summary[],next_cursor:string|null}`. 필터 변경 시 커서는 재사용할 수 없다. 최신 created_at/id 순서이며 고객 범위 조건을 먼저 적용한다.

## DTO

Summary: `id,order_id,order_number,line_id,kind,status,quantity,reason,product_name,color,size,version,created_at,updated_at`. UUID·날짜·문자열은 string, quantity/version은 정수. kind는 `return|exchange`; version은 1부터 시작한다.

Detail: Summary + `description,received_date,shipping,target_sku_id:string|null,target_color:string|null,target_size:string|null,conversion_from:'reviewing'|'received'|'inspected'|null,photos:string[],events,customer_actions:string[],admin_actions:string[]`. 교환 대상 색상·사이즈는 접수 시점 사본이며 반품 전환 때 null로 변경한다. conversion_from은 전환 동의 대기 이전 처리 단계다.
shipping은 기존 checkout Shipping 계약(recipient,phone,postal_code,address,address_detail,memo). photos는 재인코딩한 PNG dataURL이며 별도 공개 URL은 없다. events는 `{id,action,status,note,actor:'customer'|'admin',at}[]`, 시간순이다. 최초 action은 `submit`이다.

Context: `{order:OrderDetail,eligible:boolean,ineligibility_reason:string|null,lines:[{line_id,remaining_quantity,exchange_options:[{sku_id,color,size,available_quantity}]}]}`. OrderDetail은 기존 sales-orders 계약을 그대로 사용한다. 교환 재고는 조회값이며 확보·출고가 아니다.

신규 body: `{request_id,order_id,line_id,kind,quantity,reason,description,received_date,shipping,target_sku_id?,photos?}`. request_id/order_id/line_id는 UUID. reason은 `change_mind|size_color|defective|wrong_item`; description trim 후 10..2000자. quantity 정수1..1000000, bool 금지. received_date는 YYYY-MM-DD, 주문일(한국시간)부터 현재 한국 날짜까지. 교환에만 target_sku_id 필요, 같은 상품의 실제 SKU만 허용. photos 기본[], 최대3개, PNG/JPEG 각 원본·재인코딩2MiB 이하, 4096px/1600만픽셀 이하 단일프레임. Pillow로 새 픽셀이미지를 생성해 EXIF/텍스트/ICC 제거. API 전체 요청9MiB 제한.

행동 body: `{request_id,version,action,note?}`. note 최대2000자, 관리자는 trim 후 필수. 고객 기본 빈 문자열. 응답은 서버 확정 Detail.

## 상태·권한

| 현재 상태 | 관리자 행동 → 상태 | 고객 행동 → 상태 |
|---|---|---|
| requested | review → reviewing | withdraw → withdrawn |
| reviewing | approve_collection → collection_pending; reject → rejected; 교환만 request_conversion → conversion_requested | withdraw → withdrawn |
| collection_pending | receive → received | 없음 |
| received | inspect → inspected; 교환 request_conversion → conversion_requested | 없음 |
| inspected | 반품 queue_refund → refund_pending; 교환 queue_exchange → exchange_pending; 교환 request_conversion → conversion_requested | 없음 |
| conversion_requested | 없음 | conversion_from이 reviewing일 때만 withdraw → withdrawn; convert_return → conversion_from 원래 단계 |
| refund_pending/exchange_pending/rejected/withdrawn | 없음 | 없음 |

convert_return만 교환을 반품으로 바꾸고 target_sku_id와 conversion_from을 비운다. 회수품이 도착한 received/inspected 이후는 전환 대기 중에도 고객 철회 불가. 도착 확인과 검수 완료는 별도 단계이며 검수 이전 환불·교환 대기로 이동 불가. 환불·교환 대기는 외부 실행 완료나 교환 재고 확보가 아니다. 재고·주문금액·배송사본을 변경하지 않는다.

## 원자성·실패

CatalogStore BEGIN IMMEDIATE 안에서 소유권·동일주문 품목·누적수량·version을 검사하고 접수/이력/멱등 결과를 함께 기록한다. rejected/withdrawn 이외의 기존 수량을 모두 차감하여 대기건을 중복 접수할 수 없다. paid succeeded + confirmed/closed + partially_shipped/shipped/delivered 주문만 접수. 수령일은 고객 진술이며 법정 기간·불량 여부를 자동 거절하지 않는다.

actor/customer 단위 request_id는 전체 접수/행동에서 유일하다. 같은 키·같은 정규화 body 재시도는 당시 응답을 반환하며 이후 상태변경이 있어도 동일하다. 다른 내용 재사용·수량초과·version충돌·잘못된 현재상태 행동은409, 입력오류422, 미인증401, 타인·없는 주문/접수/품목404, 요청크기413. admin note 누락422.

추가 테이블 `order_claims`, `order_claim_requests`만 사용한다. 기존 sales-order 확장의 백업 정책 유지. 롤백은 라우트/모듈 제거, 신규 테이블 보존이며 기존 주문·재고 삭제 없음. 개인정보가 있는 DB와 백업은 기존 비공개 DB 접근 정책으로 운영한다. 사진 보존기간/삭제와 실 PG·택배·출고 연동은 후속 정책이다.

## 검증 책임

API 테스트 `services/api/tests/test_order_claims.py`: 권한, 소유권, 다른주문 품목, 멱등, 누적·동시수량, version·행동, 고객 전환동의, 사진, 요청크기, 페이지·필터. 임시 DB/합성 데이터만 사용. 웹 DTO/BFF는 웹 담당, 가이드 `claims`/`sales-orders` 및 실제 PC·모바일 UI 검증은 조정 담당이 통합한다.
