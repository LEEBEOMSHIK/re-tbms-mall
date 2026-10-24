# API 계약 초안 v0.3

이 문서는 경계와 구현 전 계약의 출발점이다. 실행 가능한 OpenAPI 완성본이 아니다. FastAPI 구현 전 경로별 요청/응답·인증·오류·예제를 구체화하고 생성 OpenAPI와 검증한다.

| 경계 | 경로 예시 | 요구 |
|---|---|---|
| 상품 | GET /v1/products, /products/{id}, /categories | R01–R05 공개 게시 정보만 |
| 회원 | /v1/me, /v1/me/addresses, /v1/me/consents | R07·R17 본인 범위 |
| 장바구니 | GET /v1/cart, POST/PATCH/DELETE /v1/cart/items | R08 거래 선택 시 |
| 견적 | POST /v1/checkout-quotes | R05·R06·R09 서버 재계산 |
| 주문 | POST /v1/orders, GET /v1/orders/{id} | R09 멱등·소유권 |
| 결제 | POST /v1/orders/{id}/payment-attempts | R10 도입 시 |
| 결제 확인 | POST /v1/payments/{id}/confirm | PG 방식상 필요 시 서버 승인 |
| 클레임 | POST /v1/orders/{id}/claims, GET /v1/claims/{id} | R12 품목·수량 검증 |
| CS | /v1/support-tickets | R14 내부 메모 분리 |
| 시안 | /v1/design-projects, /{id}/versions, /{id}/exports | R19–R21 작성·검토·출력 권한 |
| 관리자 | /v1/admin/products, /inventory-movements, /shipments, /refunds, /settlements | 역할별 권한, 단계별 활성화 |
| 외부 수신 | /v1/webhooks/payments/{provider}, /shipping/{provider} | 공급자 검증·중복 제거 |

## 공통 규약

- 멱등키는 사용자/상점·작업 범위로 구분하고 요청 해시·결과·보관기간을 정한다. 같은 키에 다른 입력은 409.
- 목록은 페이지/커서·최대 크기·안정적 정렬을 정의한다. 검색·필터 값을 검증한다.
- 401 인증 필요, 403 권한 없음, 404 리소스 없음 또는 존재 은닉, 409 재고/버전 충돌, 422 입력·업무 조건 오류를 구분한다.
- 외부 작업은 필요 시 202와 작업 ID·조회 경로를 반환한다. 응답 수신이 업무 성공을 뜻하지 않는다.
- 오류 구조 후보: code, message, field_errors, trace_id. 내부 스택·키·개인정보는 제외한다.
- 변경 API는 인증·역할뿐 아니라 객체 소유권을 검사한다. 화면에서 숨기는 것으로 대체하지 않는다.
- 시안 저장은 base_version을 전달하고 충돌 시 덮어쓰기 대신 비교·복제 선택을 제공한다.
- 업로드는 MIME·실제 파일 형식·크기·픽셀 수·확장자를 검증한다. 비공개 자산 다운로드 URL에는 제한된 유효기간을 둔다.
- 공급자별 웹훅 인증 방법을 검증한다. 지원하지 않는 서명 방식을 있다고 가정하지 않는다.

## 계약 완료 체크

각 엔드포인트에 요구 ID, 요청·응답 스키마, 필수/선택 필드, 권한, 상태 전이, 멱등 범위, 페이지/시간/통화 규칙, 오류 사례, 개인정보 분류를 기록한다. FE와 BE가 같은 예제로 계약 테스트를 수행한 뒤 작업을 병렬화한다.
