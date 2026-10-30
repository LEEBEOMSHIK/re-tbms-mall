# WB103 / R106 고객 모바일 UI 계획

목적: 고객 전 화면을 데스크톱 축소 대신 모바일 탐색·읽기·조작에 맞춘다. 사용자 승인 범위는 헤더/nav/모달/폰트/여백 및 디자인 문서·보드다.
담당: root 구현/통합, 별도 검증자 읽기 전용 리뷰. 기존 main 미커밋 변경 보존. 새 의존성/서버·가격·재고·인증 API 변경 없음.

1. customer-mobile-nav.tsx 신규: 767px 이하 메뉴 dialog, 링크/닫기/Escape/resize 닫기, 포커스 복귀. shop-shell.tsx 헤더 데스크톱/모바일 구분. customer-session.tsx 카트 생략 옵션으로 모바일 카트 중복 방지.
2. site-settings.tsx customer 변형: 공유 관리자 기본 유지. 고객 모바일 바닥 패널, 제한높이·내용스크롤·고정 제목/닫기·배경 스크롤 잠금.
3. customer-mobile.css 신규: 고객 선택자 범위. 16px 좌우/24~32px 구역 여백, 본문1rem/보조 .875rem/제목1.5rem 이상. 44px 터치·입력1rem. 로그인 모바일 카드 제거. 카트 반응형 조작과 상세 이미지/필터/푸터/정책·소개 정리. 큰 글씨에서는 카드1열.
4. 검증: 타입/lint/기존 웹 테스트. 실제 320/390/768 및1440 보기·라이트/다크·큰글씨, 메뉴/Escape/포커스, 모달 내부 스크롤, 홈·목록·상세·카트·로그인·소개·정책. 실고객 데이터 변경 없이 확인. 독립 리뷰.
5. docs/design-system-customer.md, docs/design-system.md, requirements/decisions 및 workboard 갱신. 증거 docs/reviews/customer-mobile.md. 미실행은 완료로 표시하지 않는다.

대안/선택: 메뉴 줄바꿈·전체 축소는 좁은 화면의 높이/터치 문제를 해결하지 못한다. 모바일 전용 탐색 패널과 고객 범위 CSS를 선택. 데이터 없는 상태는 UI 확인과 구분하고 합성 카트 검증 시 명시한다. 복구는 이번 파일변경만 되돌리며 DB/env/기존 작업 보존.
