# WB96 / R101 상품 상세 선택 탭 검증

- 2026-10-29, 구현 root / 독립 review_product_detail. 기존 WB95 미커밋 작업 위 후속 UI 변경.
- 변경 파일: catalog/product-detail.tsx, catalog/catalog.css, catalog/publication-editor.tsx 안내, reviews/review-pages.tsx embedded 모드, 요구/결정/디자인/계획/보드.
- 동작: 기본정보·가격/할인·색상/사이즈·재고·리뷰 중 선택 패널만 표시. action/on-action 토큰·굵기·밑줄로 active 표시. 이미지 기본정보 포함. 폼은 hidden으로 상태 유지. 기존 API/DB/금액/권한 변경 없음.

## 실제 검증
- RED: `.local/wb96-browser.cjs`에서 role=tab 기본정보 부재로 timeout 확인.
- GREEN: 동일 스크립트 확장 실행 통과, `.local/wb96-browser.log`.
- 5개 탭·한 패널만 노출·기본/가격 입력 왕복 보존·각 저장 완료 결과 보존, 가격 바로가기, 기존 두 edit 리다이렉트, 직접 stock 해시 및 알 수 없는 해시의 기본정보 fallback 확인.
- 좌우/Home/End 키 선택·순환, 1440/390px 및 light/dark·24px 글자에서 5개 패널 가로 넘침 없음.
- PC/모바일 스크린샷 시각 확인: `.local/wb96-desktop-tabs.png`, `.local/wb96-mobile-tabs.png`. 활성 배경·밑줄 및 선택 패널 확인.
- `npm run typecheck` 통과, `npm test` 160/160 (`.local/wb96-tests.log`), 변경 TSX ESLint 통과, `git diff --check` 통과.
- 독립 실제 Edge: 현재 상품/타상품 합성 리뷰 중 현재 상품만 표시, main 중첩 없음, 선택 패널 1개, roving tabindex 1개 확인.
- 독립 지연 저장 응답: 기본정보 저장 중 가격 탭으로 이동 후 가격 초안 입력, 기본 저장 응답 도착해도 가격 탭/초안 유지. 기본 탭 재선택 시 완료 결과 유지. 키보드·390px 다크/24px도 통과. 차단 결함 없음.

## 범위와 복구
브라우저 쓰기는 합성 응답으로만 검증했고 실제 상품/금액 DB 쓰기 없음. 이전 WB95의 409·503 검증은 해당 기록을 따르며 이번에는 서버 경계 테스트/운영 빌드/전체 보조기기 인증을 재실행하지 않았다. API·DB 미변경. 이 작업의 탭 관련 diff만 복구하고 WB95 및 기존 next-env.d.ts 변경을 보존한다. 게시/푸시/배포 없음.
판정: 독립 및 통합 검증 완료.
