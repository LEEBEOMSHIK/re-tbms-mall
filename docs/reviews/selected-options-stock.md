# WB32 조합 제외·초기 입고 검증

- 요구 R42 / 계획 docs/superpowers/plans/2026-10-26-selected-options-stock.md
- 구현 API inventory_api, UI inventory_ui, BFF/계약/문서 조정 담당. 독립 검증 inventory_review.
- 변경: API inventory.py·main.py·초기입고 테스트, 웹 catalog-forms.tsx·catalog.css·lib/catalog.ts·catalog-proxy.ts·api/admin/skus/selected-batch/route.ts·selected-sku-batch.test.ts, 관련 요구/API/결정/디자인/작업보드.

## 증거

- 독립 API160개 테스트 통과(23.57초). 초기 입고 원장·경계·권한·기존값 보존·원자성·동시 재시도 확인.
- 독립 웹45개·lint·typecheck·프로덕션 빌드 통과. selected-batch 라우트 빌드 포함, 남은 차단 이슈 없음.
- 조정 담당 Edge 실제BFF:200개 UUID 조합(10×20,16KB초과)이 유효한 요청으로 API까지 도달하고 없는 상품404 반환.66KB요청422. catalog 전후 동일해 쓰기 없음.
- Edge 모의API: 제외/복원과 작성 수량 유지, 제외된 음수 입력은 검증/전송에서 제외, 신규 두 조합에5개·0개 저장. 기준정보 새로고침과409실패 후 선택/수량 유지. 정확히 두 조합만 전송. 완료 제목 포커스·입고합계5·0개 입고필요 안내 확인.
- 기존 옵션 재고7 유지, 제외 조합 미생성,320/390px 전체 페이지 가로 넘침 없음. 스크립트 .local/selected-options-browser.cjs(ignored).
- 리뷰에서200개UUID의 요청크기 초과 발견, 해당경로만64KB 제한으로 수정. 다른 경로16KB 유지.

## 제한·복구

실제 데이터에 성공 생성/입고 요청을 보내지 않았다. 입고 원장/실패롤백/동시재시도는 별도 합성 API테스트DB에서 확인한다. 모바일은 데스크톱 Edge 뷰포트이며 실제 기기·모든 보조기술 검증은 미수행. 기존 옵션의 재고 변경은 별도 재고 관리 경로다. 신규 스키마·의존성 없음. 복구는 이전 코드로 되돌리며 이미 생성된 SKU/입고 이력을 삭제하지 않는다. 커밋·푸시·배포하지 않음.

