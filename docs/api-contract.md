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

## 상품 삭제 — WB25 / R37

DELETE `/api/v1/admin/products/{id}`: 인증된 관리자만 JSON `{version: 0}`으로 요청한다. version은0..2147483647의 strict integer. 성공200 `{id,deleted:true}`, 없음404, 버전 충돌 또는 연결SKU존재409, 잘못된 입력422. BFF `/api/admin/products/{id}` DELETE는 관리자 세션·동일 Origin·기존 JSON크기 제한을 적용하고 성공 응답ID가 요청ID와 같은지 검증한다. 토큰은 브라우저로 전달하지 않는다.

현재 삭제는 SKU가 하나도 없는 상품에 한정한다. 옵션 재고0도 연결로 취급한다. 트랜잭션에서 존재/버전/SKU확인과 삭제를 직렬화하며 번호 카운터와 원장은 변경하지 않는다. 중복 DELETE는404로 처리하며 멱등 성공을 반환하지 않는다. 응답 불확실 시 목록을 조회해 상태를 먼저 확인한다. 주문/시안 등 새 참조 모델이 도입되면 해당 관계의 삭제 보호도 함께 추가해야 한다.

## 재고 준비 현황 — WB27 / R38

GET admin/catalog의 product_readiness는 상품별 `{product_id,status,sku_count,stocked_sku_count,total_on_hand}` 배열이다. 상품마다 한 항목이며 같은 조회 트랜잭션의 SKU 현재고에서 산출한다. no_options는SKU없음, no_stock은SKU있고모든현재고0, partial_stock은일부SKU만양수, in_stock은모든등록SKU양수다. stocked_sku_count는양수현재고SKU수이며 total_on_hand는합계다. 과거 입고만으로 준비됨을 유지하지 않는다.

판매/게시 허가나 재고 예약·가용수량이 아닌 관리용 현황이다. POST/PUT 응답과 DB스키마는 유지한다. 웹 파서는 이전 API와의 호환을 위해 필드 누락을 허용하되 UI는 상태 확인 필요로 표시하며, 제공된 배열의 잘못된 ID·중복·누락·수치·상태는 거절한다.

## 색상·사이즈 기준정보 — WB30 / R40

GET admin/catalog에 option_values 배열을 추가한다. `{id,kind:'color'|'size',name,code,is_active,sort_order,version}`. id는UUID, name은1..80자, code는대문자영문/숫자1..12자, kind별이름(casefold)·코드고유, sort_order0..10000, version0..2147483647이다. 초기빈DB에는최종운영값을임의생성하지않는다.

POST `/api/v1/admin/option-values`는`{kind,name,code,is_active,sort_order}`,201확정객체. PUT `.../{id}`는`{name,is_active,sort_order,version}`,200갱신객체. 코드/종류는수정불가,삭제없음. 이름수정은기존SKU의스냅샷색상/사이즈표시를덮어쓰지않는다. 401권한,404대상없음,409중복/버전충돌,422입력오류. Next동일경로BFF는세션·Origin·JSON크기제한·ID검증을유지한다.

새 POST skus 입력은`{product_id,color_id,size_id,reorder_point}`다. 기존직접입력`code/color/size`는더이상허용하지않는다. 서버는활성상태/종류/참조를검증하고`상품내부명-색상코드-사이즈코드`로code를생성한다. 존재하지않는참조404,비활성/종류불일치422,같은상품의같은ID조합또는코드충돌409. 응답은기존SKU필드에color_id,size_id를추가하며초기현재고0이다. code의표시길이는구성필드최대길이에따르며임의64자입력제한을두지않는다.

schema4이관은기존SKU값에서기준항목을생성하고ID를연결한다. 기존code/color/size/version/on_hand와원장은보존한다. 비공개color_key/size_key는ID로전환해이름변경과무관하게조합중복을검사한다. 게시/판매정책은변경하지않는다.

## 현재 구현된 개발 기반 API (2026-10-25)

GET `/api/v1/health` → 200 JSON `{"status":"ok","service":"re-tbms-mall-api"}`. 인증·DB 없이 앱 프로세스 응답만 확인한다. DB readiness를 의미하지 않는다. `/docs`와 `/openapi.json`은 FastAPI 계약 확인용이다. 위 표의 업무 `/v1/*` 경로는 향후 초안이며 아직 구현되지 않았다.

로컬 API는 http://127.0.0.1:8100, 웹은 http://127.0.0.1:3100이다. 허용 CORS 기본값은 localhost:3100·127.0.0.1:3100이며 GET·PUT 및 Authorization·Content-Type 헤더를 허용한다.

## 샘플 상품·진열 API

GET `/api/v1/storefront`: 공개용 revision·categories·products·sections. sections는 enabled=true만 반환하고 저장 순서를 유지한다.
GET `/api/v1/admin/storefront`: 로컬 관리 키로 전체 진열을 조회한다.
PUT `/api/v1/admin/storefront`: `{revision, sections}` 전체 진열을 교체하고 revision을 증가시킨다. sections 요소는 `{id,title,subtitle,kind,product_ids,enabled}`이며 kind는 category 또는 collection이다.

관리 API는 `Authorization: Bearer <STORE_ADMIN_TOKEN>`을 요구한다. 미설정은503, 무인증/오인증은401, 오래된 revision은409, 필드·참조 제약 위반은422다. 키는 추적되지 않는 API .env 또는 서버 환경변수에서만 읽는다. 공개 응답에 포함하지 않으며 웹 브라우저 저장소에 남기지 않는다.

저장 파일은 로컬 샘플 진열 설정용이다. 운영용 인증·다중 프로세스 DB 트랜잭션·제품 관리 API의 구현을 뜻하지 않는다. 파일 손상 시 정상 기본값으로 조용히 덮어쓰지 않고 서비스 오류로 안내한다.

## 관리자 로그인과 웹 중계 API (2026-10-26)

Next.js 동일 출처 /api/admin/session: GET은 {authenticated:boolean}, POST는 {mode:"key",key:string} 또는 개발 환경 {mode:"test"}, DELETE는 로그아웃이다. 로그인 성공 시 HttpOnly 세션 쿠키를 발급하고 응답에는 키를 포함하지 않는다. 세션은 8시간 유효하며 로그아웃 시 서버에서도 제거한다.

/api/admin/storefront GET·PUT은 세션을 확인하고 기존 FastAPI /api/v1/admin/storefront로 서버 측 키를 전달한다. 브라우저는 FastAPI용 키를 저장하거나 직접 보내지 않는다. 변경 요청은 같은 Origin을 요구한다. 인증 없는 조회·변경은 401, 출처 위반은 403으로 거절한다. 진열 revision 충돌 409 및 입력 오류 422 의미는 유지한다.

/admin/workboard/source 역시 인증을 요구하며 비인증은 원문 대신 401을 반환한다. 운영 테스트 로그인은 거부한다. 운영 계정/역할 저장과 다중 프로세스 세션은 후속 범위다.

## 관리자 업무 현황 조회

GET /api/v1/admin/dashboard는 기존 FastAPI Bearer 인증을 사용한다. mode=sample, as_of 고정 기준시각, tasks·qna·inbound·shipments·inventory 목록 및 summary를 제공한다. summary는 동일 목록에서 서버가 집계한다. 입고 대기는 expected/inspection, 미답변은 unanswered, 지연은 delayed, 부족 SKU는 available<=reorder_point다. available은 on_hand-reserved다. 샘플 기준값은 운영 재주문 정책의 확정을 뜻하지 않는다.

Next GET /api/admin/dashboard는 기존 관리자 세션을 검사한 후 서버 측으로 중계한다. 미인증401, 조회 실패는 오류 안내하며 가짜0으로 대체하지 않는다. 쓰기·실거래·배송 연동 엔드포인트는 추가하지 않는다.

## 로컬 상품·재고 API

인증 경계 /api/v1/admin 하위에서 GET /catalog, POST /products, PUT /products/{id}, POST /skus, POST /inventory/movements를 제공한다. 요청/응답 세부 계약은 docs/superpowers/plans/2026-10-26-catalog-inventory.md와 FastAPI OpenAPI를 따른다. Next 동일 출처 /api/admin 하위 중계는 세션 및 변경 Origin을 검사한다.

상품/SKU/movement ID는 UUID문자열, 버전은0부터다. 현재 SKU 조합은 상품·색상ID·사이즈ID로 중복을 거절하며 자동 생성 코드도 유일해야 한다. 색상/사이즈 기준값 이름은 kind별 trim/casefold 중복을 거절한다. 신규 SKU 계약은 위 WB30 절을 우선한다. delta는 -1000000..1000000의0이 아닌 정수, 잔고/보충기준은0..1000000이다. 원장에는 reason과 서버 지정 actor 및 UTC시각을 기록한다. 401미인증,404없는 객체,409중복/오래된버전/수량 충돌/요청ID충돌,422입력오류,503저장소 오류로 처리한다. 상품·SKU 생성 성공은 201, 상품 수정·재고 변경(동일 요청 재전송 포함)은 200이다. 웹 중계의 출처 위반은 403이다.

## 상품명·분류 계약 v2

관리 catalog 응답에는 categories:[{id,name,code}]를 포함한다. Product.name은 고객 표시명이며 internal_name(자동 발급 내부 관리명), category_id(분류 ID), category(분류 표시명)를 반환한다. POST/PUT products 요청은 name, category_id, description, 수정 시 version을 보낸다. 이전 자유 입력 category 및 직접 지정 internal_name은 허용하지 않는다. 존재하지 않는 category_id는 422다. category_id는 응답 목록에서 선택한다.

internal_name은 카테고리별 서버 순번으로 발급하고 수정할 수 없다. 현재 분류를 바꿔도 유지한다. 기존 상품 UUID와 SKU API 계약은 유지한다. 웹·서버가 함께 v2 계약을 사용해야 하며 이전 클라이언트의 자유 입력 분류 요청은 입력 오류로 처리된다.

## 세부 분류·계절 계약 v3

Category에 parent_id(null 또는 대분류 ID), is_active, sort_order, version이 추가된다. GET catalog는 전체 분류와 season_options:[{code,label}], 각 상품의 seasons 배열을 반환한다. 상품 생성/수정 요청에 seasons가 필요하다. 상세 필드·구버전 상품 처리와 번호 규칙은 docs/superpowers/plans/2026-10-26-category-seasons.md를 따른다.

POST /api/v1/admin/categories는 {name,code,parent_id,sort_order,is_active}로 분류를 추가(201)한다. PUT /categories/{id}는 {name,sort_order,is_active,version}만 수정(200)한다. 코드·부모 변경/삭제는 제공하지 않는다. Next /api/admin/categories[/id]가 기존 세션과 동일 Origin 검사를 적용한다. 버전·중복은409, 없는 대상404, 잘못된 부모/계절/비활성 분류 배정은422다. 같은 이름은 같은 부모 안에서 중복될 수 없고 코드는 전체에서 유일하다.

신규 제품 분류는 활성 세부분류, 계절은 SP/SU/FA/WI의 중복 없는 조합 또는 ALL 하나다. 서버는 순서를 정규화하고 네 계절은 ALL로 통일한다. 기존 미지정/비활성 분류·계절을 그대로 유지하는 이름 수정은 허용하되 분류나 계절 변경 시 신규 유효 조건을 요구한다. 기존 관리명은 변경하지 않는다.


## 다중 옵션 조합 — WB31 / R41

POST `/api/v1/admin/skus/batch` (Next BFF `/api/admin/skus/batch`)는 `{product_id,color_ids,size_ids,reorder_point}`를 받는다. 각 ID 배열은 중복 없이1..50개, 곱은 최대200조합이다. 성공200 `{created:SKU[],existing:SKU[]}`는 요청한 조합 전체를 분할한다. 기존 조합의 코드·표시값·재고·기준 수량은 변경하지 않고 반환하며 신규 SKU는 현재고0·버전0이다. 모든 참조/활성/종류를 검증한 후 한 트랜잭션에서 저장한다. 기존 조합 제외 이외의 오류는 전체 롤백한다. 401인증,404없는참조,409코드충돌,422입력/비활성/종류/크기 위반. 동일 조합 재시도는 기존 목록으로 반환해 중복 생성하지 않는다. 최초 응답 유실 후 재시도 시 created가0일 수 있으므로 UI는 신규등록으로 오인시키지 않는다. 기존 단일 POST skus는 유지한다. 응답의 중복/누락/다른상품/잘못된 신규잔고를 클라이언트에서 거절한다.

## 선택 조합과 초기 입고 — WB32 / R42

POST `/api/v1/admin/skus/selected-batch` 및 BFF `/api/admin/skus/selected-batch`: `{product_id,items:[{color_id,size_id,initial_stock}],reorder_point}`. items1..200, 조합중복 금지, 색상/사이즈 ID 종류별 최대50, initial_stock strict정수0..1000000. 기존 batch와 단일API는 유지한다.

성공200 `{created:SKU[],existing:SKU[]}`는 요청 items를 정확히 분할한다. 기존 옵션은 입력 수량을 무시하고 현재 값 그대로 반환한다. 신규 SKU와 초기 입고를 같은 트랜잭션으로 저장한다. 양수는 현재고=initial_stock,version1 및 양수 원장1개(사유 '옵션 등록 시 초기 입고',서버행위자local-admin),0은version0·원장없음. 재시도와 동시 요청은 기존조합으로 처리해 추가 입고하지 않는다. 401인증/404없는참조/409코드충돌/422범위·중복·활성·종류 오류. 실패 시 전체 롤백한다. 응답 검증은 요청 조합/수량과 대조하며 기존재고와 신규입고를 구분한다.

WB32 BFF 요청 크기: selected-batch 경로만 최대65,536자 JSON을 허용한다. UUID를 사용하는200개 조합 요청이 기존16,384자 제한을 초과하기 때문이다. 다른 관리자 경로는16,384자 제한을 유지한다. 입력 필드/개수/수량은 서버에서 별도 검증한다.

## 조합별 부족 기준 — WB34 / R44

selected-batch items는 `{color_id,size_id,initial_stock,reorder_point?}`로 확장한다. reorder_point는 strict 정수0..1000000이며 item값이 있으면 top보다 우선한다(0포함). item미제공은 top reorder_point를 사용하고 top도 생략하면0이다. 기존 계약 호환을 위한 fallback이며 새 UI는 각item에 값을 명시하고 top은 전송하지 않는다. 기존 SKU는 기준/현재고/원장을 변경하지 않는다. 신규 응답은 각 요청의 기준과 대조한다. 다른 API·DB 스키마·재고 경계/원자성은 유지한다.

WB35 웹 재고 변경 확인: 성공 응답의 sku_id/request_id/delta/reason이 제출 요청과 일치하고 변경 전후 잔고가0..1000000인지 검증한 뒤 완료 표시한다. 표시용 변경 전 재고는 balance_after-delta다. API 요청/응답 형식과 서버 원자성/멱등 계약은 유지한다.

## 재고 이동 사유 — WB40 / R50

POST inventory/movements에 reason_code를 추가한다. 허용값 receipt(입고),sale(판매),gift(증정),disposal(불량·폐기),other_out(기타출고),adjust_in(증가조정),adjust_out(감소조정),legacy(기존호환). 누락은legacy,명시null/알수없는값422. receipt/adjust_in은양수delta,출고4종/adjust_out은음수delta,legacy는기존양방향. 상세reason과request_id/version/재고범위계약유지.

응답과catalog 원장에reason_code추가. 요청id동일+사유변경409. legacy canonical payload는새필드제외하여이관전저장요청과동일하게재시도가능. 신규명시code는payload에포함. 옵션초기입고신규원장은receipt. UI는양수수량입력에서부호를변환하며서버검증을대체하지않는다.

schema5는movements.reason_code컬럼을defaultlegacy로추가한다. 기존원장전필드·request_payload·재고·버전을수정하지않는다. 과거자유메모를자동분류하지않는다. 판매출고의금액/주문/PG연동은이번범위가아니다.

WB41: MovementCreate.reason은선택문자열(default='',최대300자)이다. 공백은trim후빈문자열허용/null422. reason_code와부호·수량·멱등계약유지. 완료표시는실제응답확인후목록으로이동하고saved query는조회원장매칭에만사용한다. 쿼리만으로저장성공을표시하지않는다.

## WB43 공급처 계약

catalog.suppliers는 {id,name,is_active,version} 배열이다. POST suppliers는 name(공백 제거 후 1~120자), is_active를 받는다. PUT suppliers/{id}는 name,is_active,version으로 낙관적 동시성을 검증한다. 동일 이름은 대소문자 무시 중복을 거부한다.

MovementCreate.supplier_id는 nullable(default null). receipt에만 실제 활성 공급처를 연결할 수 있다. 구클라이언트·초기입고는 null을 허용하되 신규 입고 UI는 필수로 선택한다. 응답에는 supplier_id와 당시 이름 supplier_name을 함께 반환한다. 기존 null 공급처는 canonical request_payload에 추가하지 않아 기존 재시도를 보존한다. 공급처가 다른 동일 요청 ID는 충돌한다. 과거 기록은 공급처 이름 수정·비활성화로 변경하지 않는다.

## WB46 공급처 상세 필드

공급처 응답과 catalog.suppliers에 english_name(120), representative_name(80), phone(40), business_number(40), contact_name(80), contact_phone(40), email(254), postal_code(20), address(240), address_detail(240), memo(1000)를 추가한다. 괄호는 최대 길이. 문자열 trim/default 빈값/null422. 선택 이메일·전화의 기본형식을 검증한다. POST 누락은 빈값, PUT에서 누락한 추가 필드는 기존값 보존, 명시 빈값은 삭제한다. name/active/version과 이름 충돌 계약은 동일하다. 실제 개인정보 예시는 문서·로그에 넣지 않는다.

## WB47 국가별 주소 계약

supplier.country_code는 빈값 또는 서버 허용 ISO alpha2 대문자 코드, region/city는 기본 빈 문자열·최대120자다. null/알 수 없는 국가를 거부한다. catalog.country_codes에 허용 코드를 제공한다. 기존 postal_code/address/address_detail은 그대로 유지하며 국가변경에 따라 자동지우기·국내 우편번호 형식 재검증을 하지 않는다. PUT 누락은 보존, 명시빈값은 지운다. 주소검색 결과는 서버주소인증이 아니며 선택 결과의 우편번호/기본주소만 UI에 반영한다.

### WB49 공급처 연락처 검증

POST/PUT phone 및 contact_phone: 빈 문자열 허용, ASCII 숫자 및 공백·괄호·마침표·하이픈만 허용하고 +는 선두 한 번만 허용한다. 비어있지 않으면 숫자 필수. +없는 번호 최대11숫자, 선두+ 최대15숫자. 위반422. 실제 번호 발급 여부 검증 아님. PUT 누락 필드는 기존값 보존, 명시 빈값은 삭제. UI는 수정하지 않은 전화 필드를 생략한다. 응답 계약/DB schema8 유지.


## 상품 이미지 — WB61

관리자 전용 `/api/v1/admin/products/{id}/images`: GET `{images:[{id,product_id,kind,name,alt,data_url}]}`, POST `{id(UUID 재시도 키),kind(design|model|garment),name(1..120),alt(선택, 기본 빈 문자열, 최대240),data_url}` → 이미지 객체. 같은 UUID/입력 재시도는 중복 생성하지 않으며 다른 입력은409. DELETE `/products/{id}/images/{image_id}` → `{id}`. Next `/api/admin` BFF는 관리자 세션과 변경 Origin을 확인한다. 최대 JSON3MiB/디코딩2MiB/종류별10개/4096px·16MP, PNG/JPEG/WebP. 요청 본문 한도 초과413(API), 손상·부적합422, 개수 초과409, 없는/타상품404. 이미지 바이트는 catalog GET과 공개 storefront에서 제외한다.


## 공장 협업 — WB62

내부 관리자: GET `/api/v1/admin/factory-workspace` → assignments/shared_images/accounts/requests. PUT `/admin/products/{id}/suppliers`는 `{version:product.version,supplier_ids:[최대1개],shared_images?:[{supplier_id,image_ids}]}`를 받아 정확 버전 검증 후 상품 version을 증가한다. 명시한 공유 목록만 교체하고 누락 시 기존 공유를 보존한다. stale409, 진행중 제작요청 배정 해제409. 이미지 ID는 해당 상품 design만 허용한다.

POST `/admin/factory-accounts`, PUT `/admin/factory-accounts/{id}`는 공급처/로그인ID/표시명/비밀번호/사용여부를 생성하거나 표시명·사용여부·선택 새 비밀번호·version을 수정한다. 계정 변경 응답에 비밀번호·해시를 포함하지 않는다. 표시명 최대80, username3~64 영문숫자._-, password12~128이다.

공장: POST `/api/v1/factory/login` → 무작위 token·expires_at·본인 account·supplier_name. token은 Next 공장 세션 서버 메모리에만 저장한다. POST `/factory/logout`, GET `/factory/workspace`, GET `/factory/products/{id}/images`, PUT `/factory/production-requests/{id}/status`. 공장 응답은 배정 상품·SKU 식별정보·본인 공장 요청·명시 공유 시안만 제공하며 실제 재고와 내부 전체 카탈로그는 제외한다.

POST `/admin/production-requests`: UUID id, product_id, 담당 supplier_id, lines[{sku_id,quantity1..1000000}], due_date(빈값 또는 날짜), note(최대2000). 동일id·동일요청 재시도는 중복 생성하지 않는다. 요청 응답은 상품/공장/SKU 표시값 스냅샷·상태·version·처리이력을 포함한다. 공장 상태 PUT은 submitted→accepted→in_production→ready, 내부 상태 PUT은 submitted→cancelled만 허용하며 version 필수. 요청·상태 변경은 재고 원장에 쓰지 않는다.



## 상품 시안·샘플 진행 — WB63

GET/PUT `/api/v1/admin/products/{id}/progress`, `/api/v1/factory/products/{id}/progress`. PUT `{status,version,note?}`; status=not_started/design_review/sample_in_progress/design_complete, note 최대1000자. 응답 `{product_id,supplier_id,supplier_name,status,version,updated_at,history:[{status,note,actor,created_at,supplier_id,supplier_name}]}`. 현재 상품버전 불일치409. 관리자 GET은 미배정 상품도 빈 supplier_id/name 및 전체 과거 이력으로200을 반환한다. 미배정 PUT과 공장 미배정/타공장 조회는404. 변경은 상품버전증가; 동일상태 빈메모 no-op. 내부 이력은 과거공장 포함, 공장은 현재 배정세대만. 기존 workspace assignments/products에 progress_status 추가. 상품공장배정 변경시 초기화, 동일배정 공유설정은 유지한다.

## 기존 옵션 부족 표시 기준 수정 — WB74

PUT `/api/v1/admin/skus/{id}/reorder-point` (관리자 인증): `{reorder_point:정수0..1000000,version:정수0..2147483647}` → full SKU200. 현재 버전과 다르면409, 없는옵션404, 검증422. 같은값도 성공시version+1이며 on_hand와 입출고 원장은 변경하지 않는다. BFF `/api/admin/skus/{id}/reorder-point`는 기존 세션/Origin 검증을 적용한다.


## WB76 옵션 설정

PUT /api/v1/admin/skus/{sku_id}/settings: 내부관리자 인증, body {is_active: strict boolean, reorder_point: strict integer 0..1000000, version: strict integer 0..2147483647}. 알 수 없는 필드는 거부한다. full SKU(is_active boolean 포함), version+1 반환. 404 없음, 409 버전충돌, 422 입력오류. 실제재고/원장/식별정보 불변. 기존 /reorder-point는 사용상태를 변경하지 않는다. BFF /api/admin/skus/{id}/settings는 기존 세션·Origin 검사를 적용한다. 구버전 읽기응답의 is_active 누락은 true로 호환하되 설정 저장응답은 boolean을 반드시 확인한다.

## 로컬 공장 테스트 세션 (WB82)

Next POST /api/factory/session에 {mode:"test"}를 개발 환경에서만 허용한다. 동일 Origin·loopback Host를 검증한 뒤 서버 로컬 파일의 전용 계정으로 기존 POST /api/v1/factory/login을 호출한다. 새로운 FastAPI 인증 우회 경로는 없다. 성공 응답은 {authenticated:true}이며 계정 비밀번호·상위 토큰을 포함하지 않는다. 공장 로그인 성공 시 내부 관리자 세션/쿠키를, 관리자 로그인 성공 시 공장 Next 세션/쿠키를 폐기한다. 일반 공장 로그인 입력/공급처 범위 권한은 동일하다.

## 공장 본인 프로필 — WB85

GET/PUT `/api/v1/factory/profile`, Next `/api/factory/profile`: 공장 세션 인증. 응답 `{account:FactoryAccount,supplier_name}`. PUT은 `{display_name,version,current_password?,new_password?}`만 허용한다. 이름 trim 후1..80, version은 음이 아닌 정수. 비밀번호 변경은 현재 비밀번호 확인과 새12..128자를 요구한다. username/supplier_id/is_active/role 등 추가 필드422. 서버는 세션 본인 계정만 수정하며 비밀번호/해시는 반환하지 않는다. 오래된 version409, 잘못된 현재 비밀번호422, 반복 실패429, 인증 실패401. 비밀번호 변경 시 요청 세션을 제외한 동일 계정 세션 폐기. Next는 기존 세션·동일Origin 검증을 사용하고429를 보존한다.

## 발송·수령·검수 — WB86
정확한 DTO/수량 한도/멱등성과 상태전이 계약은 [발송 계약](contracts/shipments.md)을 따른다. 공장 GET/POST shipments 및 상세는 본인 공장으로 제한한다. 내부 관리자만 receive/inspect/confirm을 수행한다. sample/finished를 생성 후 바꿀 수 없고 샘플에 confirm은 거부한다. 목록·상세 모두 수량/이력 스냅샷만 반환하며 공장 응답에 실제 재고 잔액을 추가하지 않는다.

## 관리자 실제 재고 요약 — WB13 / R95
GET `/api/v1/admin/inventory/overview`, Next BFF GET `/api/admin/inventory/overview`: 내부 관리자 인증 필수, 읽기 전용. 응답 `{mode:'local',as_of:ISO시간,total_on_hand:정수,option_count:정수,low_stock_count:정수,low_stock_preview:[{id,product_id,product_name,internal_name,code,color,size,on_hand,reorder_point,is_active}]}`. 수량/개수는 음이 아닌 정수다. 단일 트랜잭션에서 전체 SKU(사용 안 함 포함)의 잔고 합계 및 `on_hand <= reorder_point` 개수를 계산한다. 미리보기는 부족 옵션 중 수량 오름차순·동률 생성순으로 최대5개다. 빈 저장소는0과 빈 배열, 조회 실패는 오류이며 샘플로 대체하지 않는다. 재고/원장을 변경하지 않는다.

BFF는 no-store 및 기존 관리자 세션을 사용하고 응답 형식/개수 정합성을 검증한다. 인증 실패401, 서버 조회·형식 실패503. 브라우저는 진입/새로 조회/탭 복귀 시 조회한다. 요약 링크는 `/admin/catalog/inventory?stock=all|low`, `product_id`와 조합 가능하다. 알 수 없거나 중복된 stock 값은 전체로 조용히 확장하지 않고 잘못된 조건으로 표시한다. 검색/부족 필터 변경은 첫 페이지로 초기화한다. 예약/판매 가능 수량은 응답에 포함하지 않는다.

## 실제 고객 카탈로그 — WB87
게시·공개 조회/이미지·진열 계약은 [공개 상품 계약](contracts/public-catalog.md)을 따른다. 관리자 전체 카탈로그와 고객 DTO는 분리하며 공장/시안/원장/정확한 잔고를 고객 응답으로 재사용하지 않는다. 게시·중지는 서버 버전 검증과 이력을 사용한다. 고객 필터의 색상/사이즈/재고 조건은 동일한 활성 옵션에 함께 적용한다.

## 가격·리뷰 확장 — WB91
[상품 리뷰 계약](contracts/product-reviews.md)을 따른다. 기존 게시가격 계약을 유지하고 상품 공개 DTO에 review_summary를 추가한다. 현재 구매 인증 제공자는 차단 상태이며 실제 회원/주문 연결 전 고객 쓰기 API 사용 불가다.

## 판매 가격·할인 — WB92
[판매 가격 계약](contracts/sale-price.md)에 따라 게시 가격/이력과 공개 Product에 discount_price/effective_price/discount_rate가 추가된다. 기존price는기본가로유지한다.
