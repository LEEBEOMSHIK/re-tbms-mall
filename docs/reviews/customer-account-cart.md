# WB105 / R107 고객 계정·장바구니

- 목적: 로그인 계정 식별 및 빈 장바구니의 과도한 크기 개선.
- 담당: root, 독립 검증자 별도. 범위: customer.py/인증 파서/BFF/CustomerSession/CustomerCart/고객 CSS와 테스트·문서.
- 계약: customer에 선택 email(null 또는 문자열), profile_available(boolean) 추가. 기존 display_name/provider/id 유지. 고객키는 provider+subject 유지.
- 저장: 추가형 customer_profiles 테이블. 기존 계정·세션·장바구니 스키마 유지. 공급자 토큰/사진 저장 없음. 재로그인 때 이름 및 확인된 이메일 갱신, 미제공 값 제거.
- 수용 기준: 공급자/이름/이메일 확인, 누락 시 공급자 계정과 재로그인 안내, 작은 화면 줄바꿈, 키보드 열기/닫기. 빈 장바구니 아이콘/설명/CTA, 정상 조회 재시도 버튼 숨김. 기존 저장/실패/충돌 흐름 유지.
- 검증: 합성 공급자 응답·임시 DB의 프로필/동일계정/기존세션/미동의 경계, BFF 허용목록, 웹 전체 테스트·타입·lint, 브라우저/독립 검토 예정.
- 의존성: 기존 OAuth 설정. Google 실제 로그인 성공은 사용자 보고이며 이번 변경의 실연동 검증과 구분. Kakao 실로그인 미검증(WB101).
- 복구: 이번 변경 구간만 되돌리면 기존 코드가 추가 테이블을 무시. DB 삭제/세션 초기화 불필요. 실제 고객 데이터는 테스트에 사용하지 않음.

## 실행 결과 (2026-10-30)
- 웹 전체181/타입검사/변경 파일 ESLint 통과. 고객 API34 통과. 신규 프로필5는 구현 전 실패→구현 후 통과 확인.
- API 기본 샌드박스 실행은 TestClient의 socketpair에서 멈춰 종료. 일반 로컬 권한으로 동일 합성 테스트 실행:34 passed(5.47s). 실제 DB·OAuth·계정은 사용하지 않음.
- 독립 account_cart_review: 고객 웹16/API34(5.84s)/프로필5 및 코드/캡처 검토 통과. 테스트가 기본 .env를 읽던 부분을 합성 env_file로 격리하고 재검증했다.
- 실제 React 구성요소를 재사용한 임시 /wb105-preview에서 fetch를 합성 계정/빈 카트 응답으로 대체해 화면 검증. PC 기본뷰와320px 모바일 다크/기본16px, 라이트/더 크게20px. 계정 펼침, Enter, Escape(부모 메뉴 유지), 밖 클릭, 이메일 줄바꿈 및 가로 넘침 없음 확인. 20px panel scrollWidth238 < width239.6, 화면 scrollWidth<=320.
- 모바일 pointerdown으로 계정이 먼저 접혀 아래 설정 버튼 클릭을 놓치는 문제를 재현했다. click 이벤트로 접기를 이동하고 새로고침 후 설정 버튼 한 번 클릭 전환 확인. 로그아웃 구분선의 전역 둥근 모서리도 제거.
- 캡처: .local/wb105-desktop.png, .local/wb105-mobile-cart.png, .local/wb105-mobile-account.png, .local/wb105-mobile-account-large.png(최종 CSS 라이트/20px). 테스트 소스 .local/wb105-preview.tsx. 임시 공개 route 파일·빈 폴더 제거, 브라우저 글자/테마/뷰포트 복원.
- 한계: 공급자 실제 재로그인·실휴대폰·실제 고객 카트 쓰기는 이번에 실행하지 않음. 기존 카트 쓰기/실패/권한/버전충돌/재시도는 API와웹 기존 테스트로 확인. 실제 OAuth 프로필 표시·Kakao 설정은 WB101 유지.

- 최종 후속 독립 검토: click 이벤트 순서와 border-radius:0 변경 차단 이슈 없음. 브라우저 재검증은 root 실행 결과로 구분. 문서/fixture 정리 후 보드·고객 대상21 재통과.
