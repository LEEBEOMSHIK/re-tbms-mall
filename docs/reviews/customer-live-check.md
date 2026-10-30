# WB101 / WB102 고객 로그인·장바구니 추가 검증

독립 검증자: guide_review. 날짜: 2026-10-30. 범위: OAuth 취소·실패 복귀, 선택 유지, 고객별 장바구니, 로그아웃 및 실패 복구. 실제 고객 계정·비밀값·운영 DB는 읽거나 변경하지 않는다.

## 코드 검토와 발견 사항

- 초기 OAuth start/callback 실패 경로는 `/login?error=...`로만 이동해 상품 옵션·수량을 담은 return_to를 잃었다. 취소 후 재로그인하면 `/cart`로 기본 복귀하는 결함을 root에 전달했다.
- root가 공급자별 경로의 HttpOnly/SameSite=Lax/10분 return cookie를 추가했다. 실패 시 안전한 상품 경로만 retry URL에 복원하고 성공·실패에서 flow/return cookie를 함께 지운다. start 실패도 검증한 return_to를 유지한다. 외부 URL·관리 URL로 이동하지 않도록 기존 allowlist를 재적용한다.
- 서버 고객 식별은 `(provider, subject)`이며 이메일로 계정을 합치지 않는다. cart 및 idempotency 기록은 인증된 customer_id로 조회한다. version 충돌·수량/재고 검증·동일 요청 재시도·가격 재계산은 서버에 있다. 로그아웃은 현재 고객 세션만 폐기하며 관리자 쿠키에 영향을 주지 않는다.
- 초기 UI에는 다른 탭에서 계정 변경 시 기존 카트 화면의 mutation을 새 계정 쿠키로 보내는 위험이 있었다. 동일 cart version이면 A 화면의 입력이 B 계정에 적용될 수 있어 root에 전달했다. root가 조회 시점 세션 guard와 mutation 고정 검사를 구현했다. BFF는 현재 고객 세션의 SHA256 지문과 X-Cart-Session을 비교하고 누락/불일치는 API 호출 전에 409로 막는다. 이 지문은 인증 credential을 대신하지 않으며 실제 고객 쿠키가 별도로 필요하다. pending은 최초 조회 guard를 유지하고, 카트 재조회에서 guard가 바뀌면 drafts/pending/saved를 초기화한다. 수정 및 회귀 테스트를 확인하여 이 결함은 해결로 판정한다. 동일 계정의 재로그인에도 세션 토큰이 달라지면 보수적으로 재조회한다.
- 불확실한 장바구니 저장은 동일 request_id/절대 수량을 유지해 재시도하며, 버전 충돌은 최신 내용 확인 후 재입력하도록 한다. 성공 영수증과 실패 메시지는 구분된다. 실제 모바일 포커스·중복 클릭 동작은 이 검토에서 실행하지 않았다.

## 독립 실행 결과

- OAuth 복귀 수정 중 최초 TS 실행: 18개 중 17개 통과, 기존 production 실패 URL 기대값 1개 불일치. root가 기대값 수정 후 재실행한 `node --test apps/web/tests/customer-auth.test.ts apps/web/tests/customer-shopping.test.ts`: 18개 통과, 0개 실패(788ms).
- 최신 guard 수정 후 `node --test apps/web/tests/customer-auth.test.ts apps/web/tests/customer-shopping.test.ts` 독립 재실행: 20개 통과, 0개 실패(855ms). 실패·취소 return_to 보존, 변조 return cookie 제한, session guard 누락/불일치 시 백엔드 미호출, guard 응답 및 세션 credential 비노출을 포함한다.
- Python customer 테스트는 서비스 `.env` 읽기를 빈 설정으로 대체하는 dotenv wrapper에서 실행했다. 합성 임시 `.env`만 읽고 실제 공급자/관리자 환경변수는 테스트 프로세스 내에서 제거했다. 최초 샌드박스 실행이 무출력 대기하여 faulthandler로 진단: 첫 TestClient 요청의 asyncio ProactorEventLoop 생성→socket.socketpair→socket.accept 단계에서 대기했으며, DB나 OAuth 외부 호출 단계가 아니었다. 소유한 대기·진단 세션은 Ctrl-C로 종료했다.
- 같은 wrapper를 `require_escalated`로 실행하고 테스트 임시 경로를 `.pytest_cache/customer-independent-unsandboxed`로 분리했다. `pytest.main(['tests/test_customer.py','-q','--basetemp=.pytest_cache/customer-independent-unsandboxed'])`: **41 passed in 5.62s**. 샌드박스 외부 실행 외에 앱 소스·의존성·테스트 로직 변경 없이 통과했다. 이 결과는 합성 공급자 transport와 임시 DB 기반이며 실제 로그인 성공이 아니다.

## 실제 공급자 검증과 구분

이 보고서의 코드/자동 테스트는 합성 공급자 응답을 사용한다. 실제 Google·Kakao 계정 인증 완료, 동의 항목 제공, 실제 로그인 이후 장바구니 복귀는 검증했다고 주장하지 않는다. root의 실제 공급자 화면 확인 및 사용자 로그인 인계 결과는 별도로 기록해야 한다.

현재 판정: 코드·합성 자동 검증에서 발견한 두 결함은 수정 확인되었고 추가 차단 결함은 발견하지 않았다. 실제 공급자 로그인 완료 및 브라우저 모바일·포커스/계정전환 상호작용은 별도 검증 대상으로 남는다. root 보고에 따르면 카카오 실제 로그인은 KOE006으로 콘솔 redirect URI 확인/수정이 필요하며, 이 독립 검토는 카카오 인증 완료로 판정하지 않는다. API/운영 변경·배포·실계정 조작은 이 독립 검토에서 수행하지 않았다.

## root 실제 연동 및 통합 확인 (2026-10-30)
- 실제 localhost3100에서 양 공급자 버튼 활성, Kakao 로그인 페이지 진입 확인. 사용자 로그인 시 KOE006 보고. 새 인가 요청에서도 오류 재현, 공급자 오류 상세의 요청 URI는 http://localhost:3100/api/customer/oauth/kakao/callback. 사용자에게 같은 앱 REST API 키의 로그인 리다이렉트 URI 등록·저장 안내. 호출 허용 IP/비즈니스 인증 URI는 현재 기능 필수 아님을 공식 문서로 확인. 카카오 인증 완료는 미검증.
- Google 기존 계정으로 실제 재로그인 완료, 요청한 /products 복귀 및 계정 표시 확인. 개인정보 원문은 기록하지 않음.
- 기준 카트 빈 상태 확인 → 공개 샘플 상품 빨강/스몰1개 담기(23,200원) → 수량2개 저장(46,400원) → 새로고침2개 유지 → 로그아웃으로 로그인화면 복귀 → Google 재로그인 후 /cart에서2개·46,400원 유지 확인 → 테스트항목 삭제하여0개·0원 원상복구. 재고 변경/주문/결제 없음.
- 증거 .local/wb101-google-cart.jpg (계정 개인정보를 제외한 main영역). 성공 영수증·수량·합계 및 삭제 결과를 실제 UI에서 확인. 카카오 계정과의 실제 분리·공급자 동의취소·상품 옵션복귀는 아직 실제 공급자로 완주하지 않았으며 자동테스트와 구분한다.
- 최종 웹 고객 테스트20/20, typecheck 및 변경파일 ESLint 통과. 독립 API41/41 및 웹20/20 통과. API pytest 초기 샌드박스 loopback 대기는 중단하고 독립 검증자의 격리 승인 실행으로 확인했다.
- 수정 파일: customer-auth-core.ts, customer-shopping.ts, customer-cart.tsx, customer-add-to-cart.tsx, customer-auth.test.ts 및 계약/설정문서. 복구는 이번 복귀쿠키/session_guard 변경만 되돌린다. DB/API 스키마 변경 없음. 가이드 영향 없음: 관리자 업무·버튼·화면은 바뀌지 않았으며 고객 설정 안내는 갱신했다.
- 미완료: Kakao URI등록 후 실로그인/취소·실계정분리, Google 실제 취소·선택옵션복귀, 운영 HTTPS/앱 공개상태. WB101/102는 in-progress 유지. 브라우저 Google 검증탭 종료, 카카오 설정 확인용 탭 인계.

## Kakao 환경변수 수정 후 재확인 (2026-10-30)
- 사용자 요청으로 로컬 API 재시작. 최초 재시작 시 기존 reloader의 자식 프로세스가 포트를 유지하여 수정 전 client_id가 요청되는 것을 확인. 해당 API 프로세스만 종료하고 services/api에서 --no-access-log 단일 uvicorn 서버로 재기동(자동 reload 없음).
- 새 로그인 요청에서 변경된 client_id 반영 및 KOE006 해소, 카카오의 확인하고 계속하기 동의 화면 진입 확인. 키·계정 개인정보는 기록하지 않음. 최초 계정 연결 동의는 사용자에게 인계. 토큰 교환·쇼핑몰 복귀·실제 카카오 카트는 아직 미검증.
- 코드 변경 없음, 관리자 가이드 영향 없음. WB101/102 진행 상태 유지.

## Kakao 사용자 동의 후 실제 검증 (2026-10-30)
- 사용자가 최초 동의 후 로그인 완료를 알림. 실제 쇼핑몰 계정 메뉴에 카카오 계정/로그인되어 있어요 표시 및 인증된 빈 장바구니 확인. 이름·프로필 사진은 현재 UI에 없으며 내 계정 대체 표시 확인. 이전 동의 화면은 회원번호 제공만 안내했음. 추가 프로필 동의 설정은 별도 확인 필요.
- 공개 샘플 빨강/스몰1개(23,200원) 담기 → 수량2개 저장(46,400원) → 새로고침 유지 → 로그아웃 → Google 재로그인 시 기존 빈 카트 확인 → 로그아웃 → Kakao 재로그인 시2개·46,400원 복원 확인. 실공급자 간 장바구니 분리를 확인함.
- 검증용 상품 삭제 후0개·0원 및 빈 장바구니 원상복구 확인. 재고/주문/결제 변경 없음, Kakao 로그인 상태 유지. 증거 .local/wb101-kakao-cart.jpg (계정 개인정보 제외).
- 코드 수정 없음. 이전 코드 독립 검증과 구분되는 root의 실제 브라우저 검증이며 이번 관찰의 별도 독립 재현은 미실시. 남은 범위: 실제 동의취소·상품 선택 후 인증복귀·Kakao 프로필 제공·운영 HTTPS/공개상태. WB101/102는 진행 유지. 관리자 가이드 영향 없음.
