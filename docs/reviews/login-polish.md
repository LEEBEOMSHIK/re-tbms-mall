# WB102 / R105 로그인 화면 개선

- 목적/범위: 승인된 간결한 로그인 화면 보강. 카드·공급자 아이콘·브랜드 버튼·상태 및 정책 링크. 신규 가입폼/사업정책/인증 계약 변경 없음.
- 담당/파일: root — customer-login.tsx, customer-shopping.css, 고객 디자인 문서, 본 기록, workboard.md. 별도 검증자는 읽기/검증만 담당.
- 계약: 기존 POST form action·return_to·중복 제출 방지 유지. 공급자 미설정/조회실패/콜백오류 구분. 서버 저장 UI가 아니므로 SaveResult 및 관리 목록 분리는 해당 없음.
- 구현 선택: 기존 Next/CSS/디자인 토큰 사용. 공급자 고유 색상은 공식 브랜드 규칙 때문에 테마 공통색의 예외. Google 흰색 및 다색 G, Kakao 노랑 및 말풍선. 장식용 사진/새 의존성 없음.
- 수용/검증: 웹 타입/lint/기존 인증 테스트, 실제 브라우저 기본 화면과 모바일 확인, 별도 코드/검증 결과 대조. 실제 공급자 인증은 WB101 별도.
- 복구: 이번 로그인 컴포넌트/CSS 변경만 되돌리며 기존 작업·환경파일·DB 보존.
- 공식 참조: https://developers.google.com/identity/branding-guidelines / https://developers.kakao.com/docs/ko/kakaologin/design-guide

## 실행 결과
- root: typecheck/lint 통과. 기존 customer-auth/customer-shopping/workboard 20/20 통과.
- 독립 login_polish_review: 동일20/20 및 OAuth action/return_to/중복방지/오류/비활성 계약 유지 확인. 부제 최소 글자와 공급자 누락 시 재확인 조건 권고를 반영했다.
- 실제 CUA 브라우저: 390px dark 기본 및 light 더 크게 설정, 1440px dark에서 카드/아이콘/텍스트 배치 확인. 키보드 Tab으로 Google 버튼 포커스 표시 확인. error 쿼리 진입 안내 확인. 화면 .local/wb102-login.png. 검사 후 사이트 설정 기본/시스템 및 viewport 복원.
- 실제 공급자 클릭·동의·연결중 표시·뒤로가기 복구는 이번 브라우저에서 미실행(코드 리뷰만 수행). 공급자 조회 실패/미설정은 기존 WB100 모의검증 및 이번 분기 코드 검토이며 이번 브라우저 재현은 하지 않았다. 실계정 연동 완료 주장 없음(WB101).
- UI가 직접 DB를 저장하는 화면이 아니므로 SaveResult는 해당 없음. 상품복귀 hidden return_to 계약 유지; 기본 비회원 둘러보기는 /products로 이동.
