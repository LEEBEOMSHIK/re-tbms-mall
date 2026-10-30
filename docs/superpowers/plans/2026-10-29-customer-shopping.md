# WB100 고객 소셜 로그인·장바구니 구현 계획

**Goal:** R105 Google/Kakao 로그인·로그아웃, 고객별 SKU 장바구니, 설정 안내.
**Architecture:** docs/contracts/customer-shopping.md 고정 계약. 기존 FastAPI/SQLite, Next BFF/HttpOnly 쿠키. 별도 고객DB로 기존 catalog 스키마 변경 없음.
**담당/수정 파일:** 계약의 소유권 경계 준수. 독립 검증 별도.
**목적/범위:** 자체 비밀번호·이메일 수집/병합 없음. 실제 OAuth 등록·키 입력은 사용자. 주문/결제/재고예약은 미정 유지.

- [x] 서버: 공급자 설정/코드 교환·사용자 조회, 일회성 state/browser binding/PKCE, 계정·세션, cart 저장/버전/멱등성. 실패·권한·만료·수량/금액·삭제상품·재고 불변 테스트 먼저 작성.
- [x] BFF: 고정 origin/redirect 검증, cookie 보안/세션 분리, error redaction, csrf·callback 취소·재전송 테스트.
- [x] UI: 기존 고객 토큰/헤더 재사용, 로그인/카트/상품 담기. SaveResult, 실패 입력보존, 확정 상태·재조회, 모바일/키보드.
- [x] 문서: 요구/결정/디자인 시스템 및 개발자 앱 설정 가이드. 비밀은 환경변수 예시 이름만 작성.
- [x] 검증: 관련/전체 API 및 웹·타입/lint, 합성 OAuth/서버 응답 브라우저, 독립 검증. 실 provider 연동은 별도 미실행으로 보드 기록.

**수용 기준:** 다른 고객/관리자 권한 혼용 금지, OAuth code/state 재사용 거부, 현재 공개 SKU/가격/재고만 담기, 재고 불변, 가격미정/품절 표시, 실패·중복/409 보존, 실제 설정 누락에서 로그인 성공을 꾸미지 않음.
**복구:** 신규 customerDB 및 코드만 분리 복구; 기존 DB/작업 소스 보존. 신규 의존성·외부 지출·배포 없음.

실행 결과 docs/reviews/customer-shopping.md. 코드/모의통합 범위 완료, 실제 공급자 설정/연동은 WB101 대기.
