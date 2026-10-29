# WB59 / R69 재고에서 상품 상세 연결

- 목적: 재고 확인 중 해당 상품 정보를 바로 조회한다.
- 범위/파일: catalog-list.tsx 상품 링크, catalog.css 링크 스타일, catalog-manager.tsx detail 모드, [id]/page.tsx 및 상품 상세 컴포넌트.
- 담당: 조정 링크/문서/브라우저, supplier_ui 상세, supplier_review 독립 검증.
- 계약: 기존 인증된 관리자 catalog GET과 정확한 product_id 사용. 데이터/API 쓰기와 재고 판정 변경 없음. 읽기 전용 기본정보/재고 요약 및 기존 수정·옵션·재고 화면 진입. 없는 상품은 안내하며 다른 상품으로 대체하지 않음.
- 수용/검증: 현황/이력 상품 링크 정확성, 상세 조회·모바일·키보드, 없는 ID와 로그인 보호 확인. lint/type 독립 확인.
- 브라우저: Edge .local/inventory-product-detail-browser.cjs 통과. 실제 조회 데이터를 브라우저 응답으로 고정하고 쓰기 없이 상품 ID href/Enter 이동, 읽기 전용 상세·수정 링크·내부명, 390px 넘침 없음, 없는 ID 안내, 비로그인 로그인 이동, 이력 링크 확인.
- 문서: workboard 파서 5개 통과. supplier_review 독립 코드 검토에서 차단 결함 없음. lint 경고 없음 및 typecheck 종료 코드 0. API 테스트/운영 빌드는 미실행(기존 조회 계약 재사용).
- 복구: 이번 링크/상세 추가 부분만 복원. 다른 미커밋 변경 보존.
