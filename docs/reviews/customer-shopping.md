# WB100 / R105 고객 소셜 로그인·장바구니 검증

- 2026-10-29. root BFF/통합/문서, customer_backend 서버, customer_ui 화면, customer_review 독립 검증.
- 계약: docs/contracts/customer-shopping.md. 계획: docs/superpowers/plans/2026-10-29-customer-shopping.md. 사용자 설정: docs/customer-login-setup.md.
- 승인 범위: 구글·카카오 OAuth, 공급자별 고객 계정·세션, SKU 장바구니, 설정 안내. 자체 비밀번호·이메일 병합·주문/결제/재고예약 제외.

## 변경 파일/계약

- 서버: services/api/app/customer.py, main.py 등록 및 테스트 주입, services/api/tests/test_customer.py, services/api/.env.example. 별도 고객 schema1 DB, 기존 catalog schema17 불변. 공개 SKU/가격/재고를 읽고 원장/보유수량을 변경하지 않음.
- BFF: apps/web/src/lib/customer-auth-core.ts, app/api/customer/[...path]/route.ts, tests/customer-auth.test.ts, apps/web/.env.example. 고정 origin/redirect·CSRF·provider별 flow cookie·별도 customer HttpOnly cookie·에러 비밀 제거·응답 allowlist.
- 화면: app/login/page.tsx, app/cart/page.tsx, components/customer-{login,session,cart,add-to-cart}.tsx, customer-shopping.css, shop-shell.tsx, shop-product-detail.tsx, lib/customer-shopping.ts, tests/customer-shopping.test.ts. 기존 WB88 소재/실측/세탁 정보 및 이전 변경 보존.
- 문서: R105/결정/공통·고객 디자인 시스템/계약/계획/설정 안내/이 검증/workboard. 신규 의존성·외부 계약 없음.

## 실행 결과

- 최초 BFF 테스트는 모듈 부재로 실패 → 구현 후10/10 통과. UI 파서도 모듈 부재 실패 후5/5. 최종 웹 전체 `npm test` 180/180 통과(.local/wb100-web-tests.log), `npm run typecheck`, `npm run lint` exit0.
- 서버 신규 최초8건 실패 후 구현. 최종 전체 API `pytest -q --basetemp=.pytest_cache/customer-full-final` 563 passed (200.39s). 이후 주입 catalog별 customer DB 경로 분리 보강은 최종 고객29/29 (4.18s)로 확인. 전체563에는 당시 고객28개 포함.
- 최초 전체 회귀는551pass/공장 profile 테스트 fixture 로그인401 오류1건. 고객+공장 profile46개 재검증 및 전체563개 재검증에서 재현되지 않았다. 최초 실패를 숨기지 않으며 고객 기능 실패로 기록하지 않는다.
- 독립 고객API28/28(후속 경로분리 테스트 추가 전), 최신 BFF/파서15/15 통과. OAuth state/provider/browser binding·만료·재사용·공급자 실패 소비·불량 사용자 정보/토큰·해시 저장·로그아웃·한도·미래 스키마·고객격리·수량/가격/할인/공개상태·재고 불변·동시 버전·멱등성을 확인했다.
- 독립 리뷰에서 일반 목록의 `from` 쿼리가 로그인 복귀를 `/cart`로 바꾸는 결함 발견. 상품 복귀 URL은 color/size/quantity만 구성하도록 수정하고 공백 있는 색상명과 목록 진입 URL 회귀를 추가했다.

## 브라우저 통합

- .local/wb100-server.py로 별도8186 테스트 서버 사용. 데이터/환경파일은 .local/wb100-integration 아래 합성 자료, 실제 .local/catalog.sqlite3/customers.sqlite3 변경 없음. 테스트용 공급자 응답만 사용.
- .local/wb100-browser.cjs: 실제 Next UI → 동일 BFF core → 격리 FastAPI → SQLite. Playwright 경로 개입으로 기존8100 API와 분리했다. 외부 공급자 코드는 모의 응답이며 실제 Google/Kakao 동의 화면을 호출하지 않는다.
- Playwright가303 연속 리디렉션을 재라우팅하지 않는 대기로 초기 실행 실패. 테스트 하니스만 HTML location.replace 탐색으로 바꿔 cookie/코드교환을 검증했고 실제303 응답/헤더는 BFF 단위 테스트로 별도 확인했다.
- 구글 코드/state/cookie/계정 생성, 목록→상품→로그인→색상/사이즈/수량 복귀→담기, 카카오 로그인·장바구니 분리, 재로그인 영속성·삭제 통과.
- 서버 저장 후 응답 유실 → 같은 request_id 재시도에서도 수량 중복 없음. 충돌 응답은 쓰기 전에 주입해 입력 보존·명시 재조회·다시 저장 확인.
- 390px 저장 완료 제목 포커스·가로넘침 없음. 공급자 미설정 버튼 비활성, 비공개/가격null/현재합계0, dark·24px 확대글꼴 확인. pageerror 없음. 로그 .local/wb100-browser.log, wb100-browser-extended.log; 화면 wb100-login-disabled.png, wb100-cart-mobile.png, wb100-unavailable-dark.png.
- 독립 동일 흐름 재실행 exit0: .local/wb100-browser-review.log, 별도 스크린샷 육안 확인. JS 오류0, 변경 요청5. 인증/장바구니/모바일 검증에서 추가 차단 결함 없음.

## 실제 설정 상태와 한계

- 사용자 개발자 앱·키·운영 도메인 설정은 미수행. 실제 공급자 로그인 성공/공개심사/운영 HTTPS·메일/정책을 완료했다고 표시하지 않는다. WB101에서 사용자 설정 후 확인한다.
- 기존 실행 중 localhost:3100/login의 비모킹 확인에서는 공급자 조회503과 조회 실패 안내가 표시됐다. 기존8100 프로세스는 새 라우트 적용/접속 상태를 재시작으로 확인하지 않았으며 본 작업에서 기존 서버를 중지하지 않았다. 실제 설정 후 FastAPI/Next 재시작이 필요하다. 비활성 공급자 UI는 합성 providers 응답으로 검증했다.
- 서버 세션은 사이트 로그아웃이며 Google/Kakao 전체 계정 로그아웃·계정 연결 해제를 하지 않는다. WB100 당시에는 공급자 고유 식별자만 저장하고 일반명을 표시했다. WB105부터 동의된 이름·확인 이메일을 추가 저장하며 현재 계약은 docs/contracts/customer-shopping.md를 따른다.
- 실제 운영 부하/외부 네트워크 장애/공급자 심사까지 검증하지 않았다. 공급자 통신 timeout10초·응답256KiB 한도·리디렉트 거부, 고객 세션7일, flow10분·1회, 세션20/flow1000/cart100행·수량99는 기술적 한도다.

## 복구/인수인계

고객DB가 기존 상품DB와 분리되어 있으므로 신규 코드와 고객DB만 별도 백업/복구한다. 기존 상품·재고·디자인DB 및 미커밋 변경을 reset/삭제하지 않는다. 실제 고객DB가 생긴 뒤에는 DB파일을 지워서 초기화하지 않는다. 원본 파일의 공급자 비밀은 출력/커밋하지 않는다. 본 작업은 커밋·푸시·배포하지 않았다. 설정 순서/정확한 callback/환경변수는 docs/customer-login-setup.md에 인계한다.

- 검증 완료 후 이번 작업 전용8186 서버(PID123084)를 명령 경로 대조 후 종료. 기존8100/3100 프로세스 유지, 합성 로그/스크립트/DB는 .local/wb100-integration에 근거로 남김.
- 최종 보드 파싱/정합성 테스트 5/5 통과. 최종 git diff --check 통과.

## WB101 설정 반영 후속 확인 (2026-10-29)

- 사용자가 실제 환경파일에 입력한 Google/Kakao 자격증명4항목의 비어 있지 않음과 API/웹 origin 일치를 확인했다. 값은 출력하거나 문서에 저장하지 않았다. 이는 공급자에서 키 유효성이 확인됐다는 뜻은 아니다.
- 명령 경로로 이 프로젝트의 기존 API/웹 프로세스를 확인한 뒤 해당 프로세스만 재시작했다. API 접근 로그는 비활성화했다.
- 실제 API8100 및 Next BFF3100의 공급자 조회가 각각 HTTP200이며 Google/Kakao 모두 enabled=true다. 이전503 상태는 재시작 후 해소됐다.
- 실제 localhost:3100/login 브라우저에서 양 로그인 버튼 활성과 로그인 안내를 확인했다. 사용자 진행을 위해 화면을 열어 두었다.
- 실제 계정 선택·동의·코드교환·로그인/취소·로그아웃·실계정 장바구니 및 운영 HTTPS/공개상태는 아직 미검증이다. 이번 후속 확인은 root가 수행했으며 별도 독립 실연동 검증은 미수행이다. WB101 완료로 선언하지 않는다.
