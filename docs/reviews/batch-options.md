# WB31 일괄 옵션 등록 검증

- 요구 R41 / 계획 docs/superpowers/plans/2026-10-26-batch-options.md
- API inventory_api, UI inventory_ui, BFF/응답검증/문서 조정 담당, 독립 검증 inventory_review.
- 변경: services/api/app/inventory.py·main.py·tests/test_sku_batch.py, apps/web/src/lib/catalog.ts, api/admin/skus/batch/route.ts, catalog/catalog-forms.tsx·catalog.css, tests/sku-batch.test.ts 및 요구/API/디자인/결정/작업 보드.

## 실행 결과

- 독립 API 144개 통과(9.90초): 조합 경계·중복·권한·활성/종류/참조, 기존 재고/원장 보존, 코드 충돌 전체 롤백, 동시 재시도 확인.
- 독립 웹42개·lint·typecheck 통과. 프로덕션 빌드 통과, /api/admin/skus/batch 포함 확인. 남은 차단 이슈 없음.
- 조정 담당 Edge 모의 API: 2색상×2사이즈의 신규3/기존1 미리보기,422실패 후 선택4개 보존, 완료 화면 전환·제목 포커스·신규/기존개수·코드목록·입고/목록/추가등록 동작 확인.
- 재등록은 신규0/기존4로 안내하고 기존 재고7 보존. 320/390px 완료 화면과320px 선택 화면 페이지 전체 가로 넘침 없음.
- 독립 리뷰 발견: 기존 이관 SKU의 미리보기 코드는 새 생성식이 아닌 실제 보존 코드를 표시하도록 수정 후 확인.
- 브라우저 성공 쓰기는 모의 API만 사용. 스크립트 .local/batch-option-browser.cjs (ignored). 실제 상품/재고 데이터 생성·수정 없음.

## 제한과 복구

실제 모바일 기기/전체 보조기술 검증은 수행하지 않았다. 운영 연동·게시·입고 자동화는 범위 밖이다. DB 스키마와 의존성은 변경하지 않았다. 이전 코드 복구는 생성된 SKU를 지우지 않으며 기존 재고 이력을 보존해야 한다. 커밋·푸시·배포하지 않았다.

