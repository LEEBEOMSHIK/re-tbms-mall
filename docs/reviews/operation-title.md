# WB71 / R81 검증

- 변경: product-detail.tsx 제목행/공통배지/도움말, catalog.css 반응형, 관련문서.
- 타입검사 exit0, supplier_review 독립 코드/CSS 및 해당파일 ESLint exit0.
- Edge 1440/390 × light/dark 4조합: 데스크톱 상품명 오른쪽 수직중앙, 모바일 넘침없음, 미게시 표시와 별도시안항목, 도움말열기/Escape 확인. 데스크톱다크캡처 확인.
- 근거: .local/operation-title.cjs 및 operation-title-1440-dark.png. 실제데이터변경 없음.
- API/운영상태변경 기능을 추가하지 않았으며 전체API/빌드는 반복하지 않음. 현재 운영상태는 기존 게시미구현 정책을 표시.
- 복구: 제목행/CSS/문서변경만 되돌림.
