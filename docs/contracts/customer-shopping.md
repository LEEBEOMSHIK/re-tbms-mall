# WB100 / R105 고객 소셜 로그인·장바구니

사용자 확정: 자체 가입/비밀번호 대신 Google/Kakao OAuth, 고객별 장바구니, 개발자 설정 안내. 구현 선택: FastAPI의 별도 customer SQLite 저장소 + Next 동일출처 BFF. 기존 관리자/공장 인증·상품DB 스키마 불변. 이메일 병합/게스트 장바구니/주문·결제/재고 예약 제외.

## 인증
- API prefix `/api/v1/customer`. GET `/providers` → `{providers:[{id:'google'|'kakao',enabled:boolean}]}`.
- POST `/oauth/{provider}/start` body `{return_to:string}` → `{authorization_url,flow_token}`. 서버 설정 CUSTOMER_WEB_ORIGIN + `/api/customer/oauth/{provider}/callback`을 고정 redirect_uri로 사용.
- POST `/oauth/{provider}/finish` body `{code,state,flow_token}` → `{session_token,expires_in,return_to,customer:{id,display_name,provider,email,profile_available}}`.
- state/flow_token은 서로 독립 난수, 10분 만료·1회 소비·provider/browser binding. PKCE S256. code는 서버에서 고정 HTTPS provider endpoint로 교환하고 access token으로 공식 userinfo 조회. 브라우저 전달 identity/id_token 신뢰 금지, access/refresh token 저장 없음.
- `(provider,subject)`로 계정 생성/조회, 선택 프로필 이름/확인된 이메일 저장, 동일이메일 자동연결 없음. session token은 난수, DB hash 저장·7일 절대만료, 로그아웃 서버 폐기. GET `/me` → `{customer:{id,display_name,provider,email,profile_available}}`; POST `/logout` → `{ok:true}`. 세션은 Bearer만 허용, 다른 역할 token 거부.
- Next `/api/customer/providers`, `/api/customer/me`, `/api/customer/logout`, `/api/customer/oauth/{provider}/start`(POST), `/callback`(GET). 고객 HttpOnly SameSite=Lax cookie, production Secure; state flow cookie는 provider별·10분. mutation은 고정 web origin과 Origin 검증. session raw token/flow는 클라이언트 JSON에 노출하지 않음. 미설정 provider 비활성, 비밀/내부오류 노출 금지.
- return_to는 `/cart`, `/products`, `/products/{id}` 및 해당 경로의 query만 허용, 외부/역슬래시/제어문자/중첩 URL 금지. 기본 `/cart`.

## 장바구니
- GET `/cart` → `{version,items,item_count,total,has_unavailable}`. 모든 수치는 정수 KRW. total은 현재 유효한 행 합계이며 배송비/주문금액 확정 아님.
- item: `{sku_id,product_id,name,color,size,quantity,price,discount_price,effective_price,image,available_quantity,available,unavailable_reason,line_total}`. price류/line_total은 유효하지 않을 때 null, image는 문자열 또는 null. 비공개/삭제 상품은 현재 내부 내용 노출 금지.
- PUT `/cart/items/{sku_id}` body `{quantity:1..99,version:int>=0,request_id:UUID}`; DELETE 같은 경로 body `{version,request_id}`. 응답은 서버 확정 cart. `request_id` 동일 payload 재시도는 중복 수정 없이 응답, 다른 payload409. 고객별100행 상한. 버전충돌409, 인증401, 형식422, 비공개/가격미정/재고초과409 또는404.
- 서버가 활성 SKU·공개 상품·현재 가격/할인·가용 재고 검증, 담기/수정이 재고 차감/예약하지 않음. 읽기도 재평가하여 품절/공개중지/가격미정 표시, 삭제 가능. 고객간 cart 격리. 요청의 가격/고객ID는 거부.
- Next는 동일 경로를 `/api/customer/cart...`로 프록시하며 token cookie→Bearer만 변환. 캐시 금지.

## UI
`/login` Google/Kakao 버튼·실패/취소/미설정 안내, `/cart` 고객 장바구니·수량/삭제·현재 합계·품절 안내. 헤더 계정 메뉴(이름·공급자·제공된 이메일·로그아웃)·장바구니 링크. 상품 상세 옵션선택→수량→담기, 미로그인 시 상품으로 돌아오는 로그인 경로. 선택 유지, 서버 확정 SaveResult와 장바구니/계속쇼핑, 모바일 포커스. 고객 장바구니 수량 변경은 즉시 목록 내 조작(관리 화면 분리 규칙 대상 아님).

## 소유권/검증
customer_backend: services/api/app/customer*.py, customer 테스트, main.py 등록 및 create_app 테스트 injection; root: Next BFF/auth helper/테스트·공유 문서·보드; customer_ui: 로그인/카트/헤더/상품 상세/클라이언트 파서 및 UI테스트만. 독립 검증자는 마지막 diff/API/브라우저 확인.
공식 공급자 실로그인은 사용자 앱/키 설정 후 검증 필요. 자동테스트는 공급자 응답 모킹+임시DB만 사용하며 운영 준비 완료로 표시하지 않는다.

## WB105 선택 프로필
Google scope `openid profile email`; Kakao는 앱에서 동의한 기본 userinfo만 사용(추가 scope 강제 없음). email은 Google email_verified===true, Kakao is_email_valid/is_email_verified===true인 경우에만 최대254자 문자열. 이름 최대100자, 제어문자/잘못된 값은 미제공 처리. email nullable, profile_available boolean(이름 또는 이메일 존재). 기존 고객은 이름 '고객', email null, false. 추가형 customer_profiles 테이블로 기존 schema1 계정/세션/카트 보존. 재로그인마다 제공정보로 갱신하며 누락된 과거 값은 지운다. 계정키는 provider+subject이며 이메일 변경/동일이메일로 병합하지 않는다. BFF는 허용 필드만 반환한다.

## WB107 프로필 사진
customer에 선택 avatar_url(null 또는 HTTPS 공급자 CDN URL)을 추가. Google picture / Kakao kakao_account.profile.profile_image_url에서 읽으며 googleusercontent.com 및 kakaocdn.net 호스트/하위호스트만 허용한다. 계정정보 포함 URL·비표준 포트·fragment·제어문자는 거부. Kakao HTTP CDN URL은 HTTPS로 승격. customer_avatars 추가테이블에 URL만 저장하고 재로그인마다 갱신/미제공시삭제(null). 기존 세션에서도 갱신된 사진 조회 가능. 원본/토큰 저장 없음. BFF와 클라이언트도 안전URL 검증. 사진 로드 실패가 로그인 실패가 되지 않음.

## WB101 실연동 점검 보정 (2026-10-30)
OAuth 취소·실패 재시도는 provider별 경로/10분/HttpOnly/SameSite=Lax 복귀쿠키로 허용된 상품·옵션·수량 주소를 보존한다. callback 성공/실패에서 flow와 복귀쿠키를 지운다. 복귀쿠키는 인증에 사용하지 않으며 읽을 때도 허용 경로로 제한한다.
Next 카트 응답에 session_guard(SHA256의 cart-session: + 고엔트로피 세션 토큰 지문)를 추가하고 카트 변경 요청에 X-Cart-Session을 요구한다. 인증 자격이 아니며 실제 인증은 기존 HttpOnly 쿠키/Bearer를 따른다. 조회 당시와 현재 세션이 다르거나 guard가 없으면 API 변경 호출 전에409로 차단한다. UI의 재시도 payload는 당시 guard를 유지한다. 새 조회에서 guard 변경 시 이전 계정의 초안·완료 결과·pending을 제거한다. API 카트 업무계약/DB는 변경하지 않는다. 오래 열린 기존 UI는 새로고침 후 사용한다.
