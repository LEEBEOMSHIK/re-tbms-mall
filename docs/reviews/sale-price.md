# WB92 판매 가격·할인 검증

- 요구 R05/R99, 날짜2026-10-29. 구현 public_catalog_api/public_catalog_web, 통합root, 독립 public_catalog_review.
- 계약 `docs/contracts/sale-price.md`, 계획 `docs/superpowers/plans/2026-10-29-sale-price.md`.
- 변경: 서버 public_catalog.py/inventory.py·할인테스트, 웹 pricing.ts/ShopPrice·고객3화면·관리publication-editor/product-price·DTO/테스트. 기본가격/할인가 저장과 서버계산 최종가/할인율, 이력, 입력/응답검증.

## 실행 근거
- 서버 대상64/64 및 전체459/459, compileall0. 전체명령 `services/api/.venv/Scripts/python.exe -m pytest services/api/tests -q --basetemp=.local/pytest-discount-regression`.
- 웹 구현자 typecheck/대상lint0, 전체98/98. root typecheck0 및 가격/공개카탈로그/진열/작업보드16/16.
- 독립 임시DB27/27(구현24+독립3): 할인 생략 보존/null해제, 기존할인보다 기본가감소시422 및 상태보존, 정수내림66%, 무료100%, bool/소수/문자/음수/초과거부, 계산필드주입차단,409.
- 독립 브라우저: 홈/목록/상세 판매가격·취소선·20%·최종값, 일반/가격없음/0원100%/1%미만배지생략, 잘못된금액 저장차단,409입력보존,재조회·해제null저장·상세복귀·가격이력. PC1440/모바일390 light/dark24, 직접시각확인. `.local/wb92-review-browser.json`.
- root 실제 관리자 UI: 기존샘플 기본가29,000 유지, 할인토글→23,200 입력→미리보기→저장→상품상세복귀. 서버version2→3,history3건. 실제 홈/목록/상세 취소선29,000·20%·판매가격23,200 확인. 모바일390/dark24 넘침없음. `.local/wb92-real-price.cjs`, `wb92-real-result.json`, `wb92-admin-before-save.png`, `wb92-detail-mobile-actual.png`, `wb92-list-actual.png`.
- 커스텀 체크박스 자동화는 가려진native input직접클릭 대신 사용자에게보이는label클릭으로 검증했다. 첫시도는입력전실패하여중복저장없음.

## 데이터·환경
- schema15→16, 백업 `.local/catalog.sqlite3.pre-v16-ec058d68-45a9-4330-9e06-738e5f3a4919.bak`.
- `.local/wb92-preserve.json`: products/skus/movements/product_images/product_reviews 해시동일, 샘플외가격보존. 샘플할인만사용자미리보기범위로변경.
- Windows reload중 남은이전API자식프로세스가옛DTO반환하던문제확인. 이프로젝트해당프로세스만정리하고8100단일uvicorn으로최신코드실행. 현재자동reload는꺼져있고추가서버변경시재시작필요. 웹3100유지.

## 한계·복구
샘플20%는로컬화면검증용이며운영판매조건확정아님. 쿠폰/예약/옵션할인·실결제미구현. 할인해제토글로29,000원복귀가능. schema16이후쓰기보존없이과거DB덮어쓰기금지. 실제기존상품가격변경/푸시/배포없음.

판정: 관리자/고객가격표시·저장·경계·독립/통합검증완료.
