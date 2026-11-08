# WB229 반품·교환 접수 및 처리
## 목적·범위
R111. 고객 본인 주문에서 반품/교환을 접수하고 관리자에게 사유·수량·회수주소·사진과 처리 이력을 제공한다. PG 환불/택배 접수/재배송/재고 반영은 연결하지 않는다. 사용자 승인 범위는 설계와 구현 모두 포함하며 기존 확정 정책을 유지한다.
## 방식과 판단
주문 상태에 클레임을 섞는 방식 대신 별도 접수 원장을 주문/품목에 연결한다. 주문 금액·배송지 사본·재고는 불변. 이번 구현은 한 접수당 한 품목의 수량이며 여러 품목은 각각 접수한다. 이는 구현 선택이며 합회수 배송비를 접수 개수로 자동 부과하지 않는다. 배송비/환불 예상액은 이번 자동 정산 범위 밖, 금액 청구 UI를 만들지 않는다.
## 계약
API 고객 /api/v1/customer/claims GET POST, /claims/{id} GET POST(action), /claim-context/{order_id} GET. 관리자 /api/v1/admin/claims GET, /claims/{id} GET POST. 상세는 인증 소유자/관리자만, 목록은 개인정보·사진 제외.
접수 요청: request_id UUID, order_id UUID, line_id UUID, kind return|exchange, quantity 정수, reason change_mind|size_color|defective|wrong_item, description 10~2000자, received_date YYYY-MM-DD, shipping(기존 주소 계약), target_sku_id 교환일때만, photos dataURL 최대3장 각2MiB PNG/JPEG. 사진은 서버 decode/검사/재인코딩, EXIF제거. 웹 및 API 요청 크기 제한. 개인정보 로그 금지.
상태 requested→reviewing→collection_pending→received→inspected→refund_pending 또는 exchange_pending. reviewing에서 rejected 가능; 교환은 reviewing/received/inspected에서 conversion_requested→고객 convert_return→전환 전 단계 복귀. 고객 withdraw는 requested/reviewing 및 reviewing에서 전환 대기 중인 경우만 가능. rejected/withdrawn 종료. 외부 환불/출고 완료 전이는 만들지 않는다. 관리자 변경에 version 및 request_id, note 필수. 버전 충돌409, 재요청 동일키/내용 결과안정, 다른내용409. 모든 변경은 원자적 트랜잭션.
배송완료 또는 배송중/일부발송 주문에서 접수 허용하되 결제완료 confirmed/closed 본인 주문만. 수령일은 고객 진술이며 미래/주문전 날짜 금지. 주문에 신뢰 수령일이 없으므로 법정기간을 자동 거절하지 않고 관리자 확인 안내. 기존 비종료 접수 수량+신청량≤주문품목량. 교환은 같은상품 실제 SKU만, 재고는 조회정보이며 확보안함. 교환품절 전환은 고객 명시동의 action만.
컨텍스트: order(기존 OrderDetail), lines 별 remaining_quantity 및 exchange_options [{sku_id,color,size,available_quantity}]. 접수 DTO 세부형식은 backend/웹 계약 담당이 합의하여 문서에 추가.
## UI
고객 주문상세→접수목록 /account/claims?order_id=...→별도등록 /account/claims/new?order_id=...→완료→상세 /account/claims/{id}. 관리자 주문관리에서 반품·교환 목록 /admin/orders/claims→상세→별도처리 /admin/orders/claims/{id}/edit. 목록에 폼붙이지 않는다. 상세는 고객원문 먼저, 처리이력은 이어지는 타임라인. 공통폼/SaveResult/포커스/모달 적용, PC 2열 및 모바일1열/44px터치.
## 검증·복구
합성 임시DB 권한/수량중복/상태전이/멱등/실패/사진 경계 테스트. PC1440·모바일390 실제 브라우저 합성API와 저장 성공/실패/유지/완료/모달. 독립 검토. 신규 테이블 additive, 기존데이터 삭제없음, rollback코드만/추가테이블보존. 실제운영 변경·푸시 없음. 가이드 sales-orders 확장 및 새 claims 항목/비공개캡처. 디자인시스템·작업보드 갱신.

검토 보완: 수거 이후 철회 차단과 검수 게이트를 명시하며 conversion_from으로 회수/검수 정보를 보존한다. 교환 요청 옵션은 색상/사이즈 사본으로 표시한다. 세부 계약은 docs/contracts/order-claims.md.
