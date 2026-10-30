# 고객 주문서 초안 (WB121 / R111)

2026-10-30. PG 제외 실제 연결. 구매확정 주문이 아닌 인증 고객 소유의 저장 가능한 초안이다.

- POST `/api/v1/customer/checkouts`: source(cart/direct), request_id(UUID), cart_version 또는 sku_id/quantity. 가격·고객ID 입력 금지. 카트 버전·상품 공개·SKU·재고를 서버에서 검사한다.
- GET collection: 본인 최근 50개. GET `/{id}`: 본인 초안. 타계정은 404, 비인증은 401.
- PUT `/{id}`: version, request_id, shipping(recipient, phone, postal_code, address, address_detail, memo). 엄격한 길이/형식 검증. 원자적 버전과 요청 해시로 중복·경합을 처리한다.
- POST `/{id}/payment`: 소유권 검사 후 503. PG·예약·재고 변경 없음.
- 조회·저장 결과는 현재 공개 상품/가격/재고를 재평가한다. 저장 시점 가격을 판매 확정 가격으로 고정하지 않는다.
- total은 할인 후 상품금액. 기본 예상 배송비는 50,000원 미만 3,000원, 이상 0원. 제주 주소/우편번호는 restricted, 다른 주소는 택배사 자료가 없으므로 verification_required. 최종 grand_total은 null, payment_enabled는 false.
- customer DB에 checkout_drafts/checkout_requests를 추가한다. 기존 테이블/카트/재고 보존. 배송지는 해당 초안에 저장하며 별도 공용 주소록은 아니다.
- BFF는 기존 인증 쿠키·Origin/Host 검증 및 X-Cart-Session을 모든 checkout 쓰기에 적용한다. 허용 응답 필드만 반환하며 no-store로 제공한다.
- `/checkout`는 카트, `?sku=...&quantity=...`는 직접 구매, `/checkout/{id}`는 이어서 작성, `/orders`는 내 주문서 목록. OAuth 복귀 경로에 두 경로를 허용한다.
- 주소 검색은 클릭 시 카카오 우편번호 스크립트를 로드하고 전송 사실을 안내한다. 서비스 실패 시 직접 입력 가능. 검색 결과도 결제 가능 지역 판정 근거로 신뢰하지 않는다.

후속: PG 선정·서버 결제 시작/10분 예약·승인/만료 경합·택배사 도서산간 자료·실주문/취소/환불. 관리자 업무 가이드 영향 없음(관리자 메뉴·절차 변경 없음).
# WB127 배송지 검증 보완
`shipping.address_detail`은 필수 문자열(1~100자)이며 공백만 있는 값은422로 거부한다. 받는 분/연락처/우편번호/기본주소의 기존 검증도 유지한다. 주소록과 주문서 저장에 동일 모델 적용. 기존 초안·주소록을 조회할 때 자동 수정하지 않으며 재저장 시 누락값을 보완한다.


## WB134 고객 UI 변경
기존 POST/GET/PUT API와 저장된 초안은 호환 보존한다. 고객 주문서 UI에서는 PUT 저장과 주소록 저장 선택을 제거하고 작성 폼을 유지한다. 변경 입력은 서버 자동 저장하지 않으며 sessionStorage에서 주문서 ID·session_guard가 같은 경우만 복원한다. 인증 조회 전 복원 금지, 로그아웃 제거, 파싱/저장소 실패 시 화면 내 state 유지. 결제 준비 중 비활성 버튼만 제공한다. 일반 지역 기본 배송비 정책과 실제 주소 최종 판정을 구분한다. 내 주문서는 기존 서버 초안을 열어 같은 탭의 입력을 이어 쓸 수 있으며 새 입력이 다른 기기에 동기화되지는 않는다.
