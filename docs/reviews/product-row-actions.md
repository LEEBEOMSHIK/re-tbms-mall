# WB66 / R78 검증

- 변경: catalog-list.tsx ProductRowActions와 catalog.css; 디자인 시스템·요구사항·결정·보드.
- root: typecheck exit0. Edge 브라우저 1440/390 × 라이트/다크 4조합. 수정/더보기 한 줄, 44px, popover 뷰포트 안 배치, Tab 링크 접근/Enter 열기/Escape·외부 클릭 닫기, 삭제 확인 열기·취소 뒤 더보기 포커스 복귀 통과. 실제 삭제·데이터 변경 없음. 열린 메뉴 모바일 캡처 확인.
- supplier_review: 독립 소스 검토 및 lint exit0. 기존 삭제 버전/옵션 연결 차단/불확정 결과 재조회 계약 보존 확인.
- 증거: .local/row-actions-browser.cjs 및 .local/row-actions-1440.png, .local/row-actions-390.png (로컬 산출물).
- 한계: API/DB 미변경으로 API 전체 테스트·실제 삭제 반복 미실행. 네이티브 popover 미지원 구형 브라우저는 검증하지 않음. Space 키·다른 행 간 전환은 별도 자동 검사하지 않음.
- 복구: ProductRowActions와 관련 CSS를 이전 행 버튼 구조로 되돌림.
