# WB106 / R107 계정 화살표
- 목적/범위: 사용자 캡처의 아래로 치우친 화살표 수정. root 담당. customer-session.tsx/customer-shopping.css 및 문서만 변경.
- 원인: ⌄ 문자 glyph의 기준선·여백 때문에 flex center여도 눈에 보이는 선은 중앙 아래. 중앙을 기준으로 대칭인 SVG path m6 9 6 6 6-6, 24 viewBox와16px 고정박스로 교체. open 상태180도 회전/기존 details 동작 유지.
- 계약: API/DB/권한/저장 변경 없음. OAuth 정보 조회는 공식 문서·코드 확인이며 실제 계정 응답 수집 아님.
- 수용/검증: 글꼴과 무관한16px 아이콘, 닫힘/열림 회전 중심 유지. 타입/lint·독립 코드 검토 예정. 복구는 두 파일의 이번 변경 구간 되돌리기.

- 결과: 타입검사·대상 ESLint 통과. account_cart_review 독립 코드 검토 통과(중앙 좌표12, 고정16px, 회전/말줄임/키보드 유지). 이번에는 브라우저 재촬영 미실행. 사용자 원본 캡처와 코드 원인 대조 및 SVG 기하 정렬 검증으로 한정. OAuth 비교표는 docs/customer-login-setup.md, 공식 Google/Kakao 문서 확인. 실제 계정 원문·추가 동의 조회 없음.
