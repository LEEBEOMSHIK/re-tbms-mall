# WB70 / R80 상품 정보 통합·이미지 드롭

- 목적: 공장/시안의 관계를 상품 정보 항목으로 명시, 전체 이미지 등록에 drop 지원.
- 담당: root 상품정보/문서, supplier_ui 이미지입력, supplier_review 독립 검증.
- 파일 소유: root product-progress.tsx/css, product-detail.tsx, factory-admin.tsx; UI agent product-images.tsx/css 및 필요 공통입력.
- 계약: ProductProgress fields 모드가 dl의 div/dt/dd 항목을 반환. 담당공장 링크와 시안진행상태 별도 항목. 이미지 업로드 API/종류/단일파일/2MB정책 유지, 파일선택과 drop 같은 검증 경로. 복수파일은 명확히 거부. 드롭은 등록 화면에서 파일 선택 대체이며 자동저장·갤러리정렬 아님.
- 수용: 별도공장카드 없음, 미배정/오류 명시, 모바일1열. design/model/garment drop·미리보기·형식/크기/복수오류·키보드선택·busy차단.
- 검증: 타입/lint, 모의쓰기브라우저, 독립검토. 실제데이터 변경 금지.
- 복구: UI변경만 복원. DB/API/의존성 변경 없음.
