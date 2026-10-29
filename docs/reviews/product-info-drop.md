# WB70 / R80 검증

- root: product-progress.tsx/css fields모드, ProductFactorySummary fragment, ProductDetail dl내통합. supplier_ui: product-images.tsx/css 드롭 입력. 문서/보드갱신.
- 타입검사·담당 ESLint 통과. supplier_review 독립 통합 lint exit0 및 dl구조/미배정/오류/드롭검증·잠금·읽기경합 코드검토 통과.
- root 브라우저: 상품정보 내2항목/별도카드없음, 1440/390 × light/dark 가로넘침없음, 미배정에서 가짜작업대기없음, 조회실패/재시도 표시. .local/product-info-browser.cjs, product-info-390-dark.png.
- UI 담당 브라우저: design/model/garment drop미리보기, 다중/타입/2MB초과 거절 및 이전내용 보존, 파일선택/키보드,390dark24px 가로넘침없음. .local/wb70-image-drop-browser.cjs. API쓰기0.
- root 추가 브라우저: 지연 FileReader 후 잘못된 복수선택으로 이전읽기 무효화, 저장 중drop무시, 모의503업로드 실패입력보존. .local/wb70-image-drop-race.cjs. 실제 서버 쓰기 없음.
- 이미지/재고/권한 API 미변경. 실제서버 업로드·전체API·전체빌드는 반복하지 않음. drop은 등록화면 입력이며 갤러리 순서변경 아님.
- 복구: 위 UI변경만 되돌림. DB마이그레이션/새의존성 없음.
