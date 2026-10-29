# WB94 관리자 세션 만료
요구: 관리자 인증. 목적: 이미 열린 화면에서도 만료 시 로그인 이동.
범위: 공통 관리자 레이아웃/HTTP 클라이언트/로그인 안내. 서버 권한 검증 유지.
계약: 동일 출처 /api/admin/ 401만 만료 이벤트. 세션 expiresAt 및 복귀 시 GET session 검사. 403/503/네트워크 실패는 로그인 이동하지 않음.
수용: 관리자 내용 숨김→기존 세션 삭제 시도→로그인 이동. 중복 401은 한 번만 처리. 입력 자동 제출 없음. 미저장 입력은 만료 이동 시 유지 보장하지 않음.
검증: 단위 경계 테스트, 타입/lint, 독립 리뷰 및 실제 브라우저.

## 검증 결과 (2026-10-29)
- 전체 웹 160 통과, TypeScript 통과, 전체 ESLint 통과.
- 독립 expiry_review: 인증/세션/재고 조회 10 통과, 401 경계 및 다중 탭 재로그인 시 기존 만료시각 경합 검토 통과. 비동기 정리 시 active 확인 추가.
- 실제 브라우저: 관리자 탭을 유지한 채 두 번째 탭에서 로그아웃 → 기존 탭 재고 새로 조회 → /admin/login?reason=expired 자동 이동. 관리자 메뉴/데이터 사라짐, 만료 안내 확인.
- 증거: .local/integration-WB93/session-expired.png, expiry-tests.log, expiry-lint.log.
- 자연적인 8시간 경과 실기 시험은 미실행. 타이머는 서버 GET의 현재 authenticated/expiresAt를 재확인하며 단순 네트워크 실패는 만료로 간주하지 않는다.
- 파일: lib/admin-auth-fetch.ts 및 catalog/dashboard/inventory-overview/storefront 요청, garment-designer/client, shipments/shipment-page, admin-session-guard, 보호 레이아웃, 로그인 page, session GET.
- 기존 서버 세션 권한·TTL 유지. session GET은 비밀 없는 expiresAt만 추가. 로그인 화면 reason=expired는 세션 정리 실패 시 리다이렉트 반복 방지용 표시 경로이며 보호 화면의 인증 검사는 그대로다.
- 복구: 위 공통 guard/wrapper 연결을 되돌리면 이전 오류 표시 동작으로 복귀. DB 변경 없음.
