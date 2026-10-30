# WB88 / R104 상품 상세 정보 보강 검증

- 날짜: 2026-10-29. 웹·문서 root, 서버 details_backend, 독립 review_product_detail. 기존 main HEAD185d8cc 및 WB95~99 미커밋 변경 보존.
- 목적/범위: 상품 기본정보와 등록 화면에 소재·혼용률, 세탁·관리, 실측 참고사항, 사이즈/측정부위별 cm 입력. 고객에게 입력된 섹션만 표시. 실제 회사·배송·교환·결제 정책은 제외.
- 계약/의존성/수용 기준: docs/contracts/product-details.md 및 docs/superpowers/plans/2026-10-29-product-details.md. 새 의존성 없음. 기존 기본정보 저장·권한·버전·SaveResult 재사용.
- 서버 변경: app/product_details.py, inventory.py, public_catalog.py, factory.py의 오류 직렬화 보완. tests/test_product_details.py 및 기존 마이그레이션 테스트의 schema17 기대값/구버전 fixture 정비.
- 웹 변경: lib/product-details.ts, catalog.ts, storefront.ts, catalog/product-details-fields.tsx, catalog-forms.tsx, catalog.css, components/product-details-view.tsx/.css, shop-product-detail.tsx. tests/product-details.test.ts 및 public-catalog.test.ts.
- 문서: requirements R104, decisions, 공통/관리자/고객 디자인 시스템, public-catalog 계약, 신규 상세 계약/계획/이 문서/workboard.

## 실행 결과

- 웹 파서 테스트 구현 전 3건 실패 확인 → 구현 및 legacy 기본값 기대값 정비 후 `npm test` 163/163 통과. .local/wb88-web-tests.log.
- 최종 `npm run typecheck` 통과. 초기 타입검사에서 반복 입력 컴포넌트가 재고 폼에도 중복 삽입된 문제를 발견해 제거 후 재검증.
- `node .local/wb88-browser.cjs`: 실제 Next/Edge UI와 합성 상품 API 응답으로 신규 등록·다음 등록 초기화, 기존 수정, 실측 추가/삭제, 탭 왕복 초안, 409와 최신 버전 재조회 후 입력 보존, 저장 확정 결과·모바일 포커스, 재진입, 중복 실측 차단, 전체 지우기 검증. .local/wb88-browser.log.
- 고객 실측 사이즈×부위 표, 미측정 조합 —, 줄바꿈, 빈 섹션 숨김, 밝은/어두운 테마 및 390px 넘침 확인. .local/wb88-admin-saved.png, .local/wb88-customer-mobile.png.
- 독립 브라우저: 업무 실API를 차단한 합성 응답으로 동일 시나리오와 최초 오류 포커스까지 확인. 차단 이슈 없음.
- 독립 서버: 임시DB 대상 `services/api/.venv/Scripts/python.exe -m pytest services/api/tests/test_product_details.py -q --basetemp=.local/pytest-wb88-independent-final` 28/28 통과. 생략 보존/명시 초기화, 권한/없는ID/버전, 최대치/타입/중복, 공개 필드, schema16→17 백업과 기존 상품·SKU·원장·가격 보존.
- 최초 원시 NaN/Infinity/-Infinity 요청 3건은 Pydantic 거부 후 오류 응답 JSON 직렬화에서 실패. 비유한 오류 input만 문자열로 변환하여 422 유지하도록 보완 후 독립 28건 통과.
- 최종 `npm run lint` 전체 통과. 서버 전체 회귀: services/api에서 `.\.venv\Scripts\python.exe -m pytest -q --basetemp=.pytest_cache/wb88-complete` → 534 passed in 170.27s, exit0. 실행 출력 session98360/chunk6a73de(별도 로그 파일 없음). 초기 전체 회귀에서 새 details 컬럼/버전 추가로 기존 구버전 fixture 기대값이 실패하여 원래 컬럼 보존 비교로 정비 후 전체 재검증했다. 최종 git diff --check 통과.

## 한계 및 복구

- 실제 업무 DB의 상품 생성/수정은 실행하지 않았다. 브라우저 저장은 합성 API, 서버 저장·마이그레이션은 임시DB에서 검증했다. 기존 개발 서버 재시작, 커밋, 푸시, 배포 없음.
- 전체 운영 연동/실제 상품 정보의 정확성/전체 접근성 인증은 이 검증 범위 밖이다. 소재와 치수 기본값을 임의 생성하지 않는다.
- schema17 호환 코드로 수정하는 것이 우선. 구 schema16 코드로 단순 롤백할 수 없으며 필요시 .pre-v17-UUID.bak 복구와 이후 변경 대사가 필요하다. 프론트만 되돌리면 details 생략 수정이 기존값을 보존한다.
- 기존 next-env.d.ts 및 WB95~99 변경을 보존하고 이번 변경만 선별적으로 되돌린다. git reset/clean이나 일괄 삭제를 사용하지 않는다.

- 최종 판정: 독립 검증자 review_product_detail이 차단 이슈 없음으로 확인. 전체 회귀와 독립 대상 검증을 함께 근거로 WB88 완료.
