# WB97 상품 상세 탭 시각 보완

- 요구: R101 후속 사용자 스크린샷 피드백. 목적: 과도한 흰 버튼·문자 밑줄·패널 외곽 포커스를 절제한 선택 탭으로 변경.
- 담당: root 구현/통합, review_product_detail 독립 검증.
- 범위/파일: catalog.css 선택 탭 스타일, product-detail.tsx 패널 tabIndex 제거, 디자인/결정/보드. 기존 미커밋 WB95/96 보존.
- 계약: API/DB/탭 hash/ARIA/저장/초안 유지 불변. 기존 의미 토큰 사용, 새 의존성 없음.
- 수용: 외곽선 없는 탭, subtle 선택 배경·2px 하단 표시·500/600 굵기, 키보드 버튼 포커스 유지, 패널 내부 컨트롤 접근, 모바일 줄바꿈.
- 실제 검증: `.local/wb96-browser.cjs` 재실행 → 5개 패널/저장·초안/키보드/해시/기존URL/1440·390·light/dark·24px 모두 통과. 결과 `.local/wb97-browser.log`. 합성 저장 응답만 사용, 업무 DB 쓰기 없음.
- 시각 확인: `.local/wb96-desktop-tabs.png`, `.local/wb96-mobile-tabs.png` 최종 출력. 간격 토큰 점검 및 중복 경계선 제거 후 재실행. git diff --check 통과.
- 미실행: 전체 앱 테스트·운영 빌드는 이번 CSS/포커스 표현 변경에서 재실행하지 않음. WB96 타입/웹160 결과와 구분.
- 복구: WB97 탭 CSS/패널 tabindex diff만 되돌린다. 기존 작업·DB 보존. 게시/푸시/배포 없음.
- 독립 검증: 5개 탭에서 Tab 키로 활성 패널 컨트롤 접근, 패널 1개/390px 넘침 없음. computed style 외곽선0·문자밑줄없음·focus outline inset·선2px·weight600 확인. 최종 다크/24px 모바일 시각 확인, 패널 파란 외곽선 없음. `.local/wb97-review-mobile.png`. 차단 결함 없음.
- 판정: 독립 및 통합 검증 완료.
