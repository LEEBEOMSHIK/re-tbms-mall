# 구글·카카오 로그인 연결 안내

WB100 구현 / 실제 앱 연결은 WB101. 인증 키는 이 문서나 채팅에 적지 않고 로컬 환경파일에 입력하세요. 고객 계정은 공급자 고유 식별자와 제공된 이름·확인된 이메일을 저장합니다. 프로필 사진은 제공된 CDN URL만 저장합니다. 비밀번호·사진 원본·공급자 토큰은 저장하지 않습니다. 두 공급자로 로그인하면 각각 별도 고객 계정과 장바구니가 만들어집니다.

## 1. 구글 앱 등록

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 프로젝트를 만들거나 선택합니다.
2. OAuth 동의 화면에서 서비스 표시명·지원 이메일·개발자 연락처를 입력합니다. 공개할 도메인과 서비스 소개/개인정보 안내 주소는 실제 운영 정보로 준비합니다.
3. OAuth 클라이언트 ID를 **웹 애플리케이션** 유형으로 생성합니다.
4. 승인된 리디렉션 URI에 `http://localhost:3100/api/customer/oauth/google/callback`을 정확히 등록합니다.
5. 발급된 클라이언트 ID·클라이언트 보안 비밀을 아래 서버 환경파일에 입력합니다. 테스트 대상/공개 상태는 콘솔에서 확인합니다.

구현은 서버 인가 코드 방식이며 Google JavaScript SDK나 브라우저용 키를 사용하지 않습니다. Google에는 `openid profile email` 범위를 요청합니다. 운영 URI는 HTTPS 도메인으로 추가해야 합니다. [Google 웹 서버 OAuth 안내](https://developers.google.com/identity/protocols/oauth2/web-server), [OpenID Connect 안내](https://developers.google.com/identity/openid-connect/openid-connect).

## 2. 카카오 앱 등록

1. [Kakao Developers 앱 관리](https://developers.kakao.com/console/app)에서 앱을 만들고 실제 서비스 정보를 입력합니다.
2. **카카오 로그인 → 사용 설정**을 ON으로 켭니다.
3. 앱의 REST API 키에 리디렉트 URI `http://localhost:3100/api/customer/oauth/kakao/callback`을 등록합니다. 설정 화면 명칭이 달라지면 공식 설정 안내를 기준으로 찾습니다.
4. **앱 → 플랫폼 키 → REST API 키 → 클라이언트 시크릿**에서 시크릿을 확인·활성화합니다.
5. **REST API 키**를 `KAKAO_CLIENT_ID`에, 시크릿을 `KAKAO_CLIENT_SECRET`에 입력합니다. JavaScript 키·어드민 키를 넣지 않습니다.

계정 식별은 `/v2/user/me`의 회원번호를 사용하므로 OpenID Connect 활성화는 필요하지 않습니다. 이름을 표시하려면 앱의 카카오 로그인 > 동의항목에서 닉네임(profile_nickname)을 설정하세요. 카카오계정 이메일(account_email)은 앱에 권한이 있는 경우 선택 동의로 설정할 수 있으며, 미동의·미제공이어도 로그인은 가능합니다. Kakao Sync·메시지·친구 권한도 사용하지 않습니다. 로그아웃은 이 쇼핑몰의 세션만 종료하며 카카오계정 전체 로그아웃이 아닙니다. [카카오 로그인 설정](https://developers.kakao.com/docs/ko/kakaologin/prerequisite), [카카오 REST API](https://developers.kakao.com/docs/ko/kakaologin/rest-api).

## 3. 환경변수 입력

`services/api/.env`의 **기존 내용을 보존하고** 다음 항목을 추가합니다. 빈 값을 발급받은 값으로 채웁니다.

```dotenv
CUSTOMER_WEB_ORIGIN=http://localhost:3100
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
```

`apps/web/.env.local`에도 기존 값을 보존하고 추가합니다.

```dotenv
CUSTOMER_WEB_ORIGIN=http://localhost:3100
CUSTOMER_API_BASE_URL=http://127.0.0.1:8100
```

- 로컬 고객 사이트는 **http://localhost:3100**으로 접속합니다. `127.0.0.1`로 번갈아 접속하면 쿠키·Origin·등록 URI가 달라집니다. 호스트를 바꾸려면 두 환경파일과 공급자 URI를 모두 맞춥니다.
- 각 공급자는 ID·시크릿 두 값이 있어야 로그인 버튼이 활성화됩니다. 하나만 설정하면 나머지 공급자는 준비 중으로 표시됩니다.
- 비밀값은 `NEXT_PUBLIC_` 변수나 Git 저장소에 넣지 않습니다. `.env.example`은 이름만 제공하는 예시입니다.
- 환경변수 변경 후 **본인이 실행한 FastAPI와 Next 개발 서버를 재시작**합니다. 이번 작업에서 기존 서버를 임의 재시작하지 않았습니다.
- 운영에서는 양쪽 `CUSTOMER_WEB_ORIGIN=https://실제도메인` 및 공급자별 해당 도메인의 callback URI를 등록하고, API 주소는 운영 서버의 내부 주소로 설정합니다. 운영 Next는 HTTPS origin이 명시되지 않으면 고객 인증을 차단합니다.

## 4. 설정 후 실제 확인할 항목 (WB101)

- 구글·카카오 각각 로그인 성공, 동의 취소, 다시 로그인, 로그아웃.
- 상품의 색상·사이즈·수량 선택 → 로그인 → 해당 상품 복귀 → 장바구니 담기.
- 같은 소셜 계정으로 다시 접속했을 때 장바구니 유지, 다른 공급자/고객의 장바구니와 분리.
- 가격·재고·공개 상태가 바뀌었을 때 장바구니 안내와 합계 확인.
- 운영 공개에 필요한 공급자 콘솔의 앱 상태/도메인·서비스 정보 확인. 실제 운영 정보나 정책은 코드가 임의로 만들지 않습니다.

현재 자동 검증은 합성 공급자 응답과 임시DB를 사용합니다. 실제 앱 키·공급자 동의 화면·공개 심사·운영 HTTPS 연결 성공을 검증한 것으로 보지 않습니다. 앱 등록이 끝나면 키 자체 대신 **설정한 공급자와 접속 도메인**만 알려주면 후속 검증 범위를 확인할 수 있습니다.

## 데이터·운영 참고

고객 DB는 `.local/customers.sqlite3`이며 기존 상품DB와 별개입니다. 고객별 장바구니는 상품을 예약하거나 재고를 차감하지 않습니다. 가격은 현재 공개 가격으로 재계산하고 배송비·주문·결제는 연결하지 않습니다. 비활성·삭제·품절 상품은 표시를 제한하고 삭제할 수 있습니다.

세션은 7일 절대만료, 로그인 흐름은 10분·1회 사용입니다. 기술적 보호 한도는 활성 로그인 흐름1,000개, 고객별 세션20개, 장바구니100옵션/옵션별99개입니다. 세션 식별자는 DB에 해시로 저장하고 공급자 access/refresh token은 저장하지 않습니다. 자체 회원가입·비밀번호 재설정·계정 자동 병합 기능은 없습니다.

## 계정 정보 표시 (WB105)
기존 로그인 세션은 유지됩니다. 이전 로그인 때 이름/이메일을 받지 않았다면 직접 로그아웃 후 다시 로그인하세요. Google은 새 범위에 대한 동의 화면이 표시될 수 있습니다. Kakao는 앱 권한 및 사용자의 동의에 따라 이름/이메일이 없을 수 있고, 그때는 공급자 계정과 안내만 표시합니다. 자동 재인증·자동 동의는 하지 않습니다. 실제 Google 로그인 성공은 사용자 보고이며, 이번 프로필 표시와 Kakao 실연동은 WB101에서 확인합니다.
공식 프로필 필드 근거: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Kakao 사용자 정보](https://developers.kakao.com/docs/ko/kakaologin/rest-api).

## 공급자가 제공할 수 있는 정보와 현재 사용 범위 (WB106, 2026-10-30)
| 항목 | Google 기본 OIDC | Kakao 사용자 정보 | 현재 쇼핑몰 |
| --- | --- | --- | --- |
| 계정 고유 ID | sub | id | 계정 식별에 사용 |
| 표시 이름 | name, given_name, family_name | profile.nickname | Google name / Kakao nickname 저장·표시 |
| 이메일 | email, email_verified | email, is_email_valid, is_email_verified | 확인된 이메일만 저장·표시 |
| 프로필 사진 | picture | profile_image_url, thumbnail_image_url | URL 저장·원형 사진 표시(WB107) |
| 전화번호·생일·성별 등 | 현재 openid/profile/email 기본 로그인 범위에 포함되지 않음 | 항목별 앱 권한·동의 설정 필요 | 요청·저장·표시하지 않음 |
Kakao의 실명(name)·연령대·출생연도·생일·성별·전화번호·CI 등은 기본 로그인의 자동 제공 정보가 아니며 항목별 앱 권한과 사용자 동의 조건에 따른다. 배송지는 별도 API/권한 영역이며 현재 구현에 없음. 이름/사진/이메일도 공급자 보유 데이터·동의에 따라 누락될 수 있다.
공식 근거: [Google userinfo](https://developers.google.com/identity/openid-connect/reference), [Kakao 동의 항목](https://developers.kakao.com/docs/ko/kakaologin/utilize). 이 표는 제공 가능한 필드와 코드 계약 비교이며 특정 실제 계정의 원문 응답을 조회했다는 뜻이 아니다.

WB107 이전에 로그인했다면 사진 URL을 저장하지 않았으므로 직접 로그아웃 후 재로그인해야 사진을 받을 수 있습니다. Kakao는 profile_image 동의항목 설정 및 사용자 동의에 따라 사진이 제공됩니다. 미제공·로드실패 시 이름 첫글자로 표시합니다.

### KOE006이 표시될 때 (WB101 실연동 점검)
카카오 공식 오류 안내에 따르면 요청 URI가 등록되지 않은 경우다. 현재 로컬 REST API 요청은 http://localhost:3100/api/customer/oauth/kakao/callback 이다. 해당 앱의 앱→플랫폼 키→REST API 키→카카오 로그인 리다이렉트 URI에 정확히 등록한다. JavaScript 키 설정과 혼동하지 않고 http/호스트/3100/경로/끝슬래시를 대조한다. 저장 후 쇼핑몰 로그인에서 새로운 요청으로 다시 시작한다. https://developers.kakao.com/docs/ko/kakaologin/trouble-shooting
