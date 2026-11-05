# WB202 · 모달 배경 위치 유지

- 요구 R107. 목적: 모달 열기/닫기 때 구매 화면이 좌우로 흔들리지 않는다.
- 담당 root 구현·통합, hold_ui 독립 검증. 수정 파일 globals.css 및 디자인 시스템/작업 보드/본 기록.
- 원인: PC의 body overflow:hidden으로 기본 스크롤바15px가 사라진다. 실제 Chrome1440에서 body폭1425→1440, 본문과 주문요약 x좌표+7.5px, 닫기 후 원복 재현. 모바일은 오버레이 스크롤바라 별도 확인한다.
- 변경: 루트 html의 scrollbar-gutter:stable로 원래 스크롤바 자리를 유지한다. 각 모달의 배경 스크롤 잠금과 초점 복귀는 보존. 수동 padding 보상·새 의존성·API 변경 없음.
- 수용 기준: 실제 스크롤바 PC/모바일 반복 열기닫기 전후 본문·요약·헤더 좌표 및 scrollY 유지. 안내 두 종류와 담기 완료 등 공통 적용 영향 확인.
- 가이드 영향 없음: 메뉴·문구·업무 순서·버튼 위치 변경이 아니라 모달 중 배경 레이아웃 보존. 기존 관리자 캡처 재촬영 불필요.
- 복구: WB202 html 규칙만 되돌리며 기존 미커밋 변경을 보존한다.

## 검증 · 2026-11-05

로컬 Chrome의 Playwright 기본 숨김 스크롤바 인자를 제외하여 PC 기본 스크롤바를 실제로 재현했다. `.local/wb202-measure.cjs` 변경 전 body1425→1440/x+7.5px, 변경 후 body1425 유지/x이동0px 확인. 모바일 scrollY761 전후 동일.

`.local/wb202-check.cjs`에서 기본/오버레이 스크롤바, PC1440/모바일390 조합 각각 배송/반품 모달을 3회씩 총24회 열고 닫았다. 배경 header/main/summary의 x/y/width/height와 scrollY 동일, 초점 복귀 통과. 로그 `.local/wb202-check.log`. 실제 캡처 `.local/wb202-modal-1440.png`, `.local/wb202-modal-390.png` 시각 확인. 가이드·작업보드 테스트9 통과. 변경이 CSS 한 규칙이므로 새 JS 단위테스트/전체 빌드는 추가하지 않았다.

독립 검증: PC1440/390 touch 각각 배송3회·반품3회·담기완료2회 총16회에서 header/main/summary/detail-copy 좌표·치수·body폭·scrollY 동일. 실제 상품 화면과 합성 장바구니 응답으로 검증하고 실제 사용자 데이터 쓰기 없음. `.local/wb202-independent.cjs` 및 `.local/wb202-independent.json`, 종료0. 미해결 결함 없음, 통합 완료(root).
