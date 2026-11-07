# WB210 / R107 상품 판매 설정 진입 통합

- 사용자 승인: 상단 중복 설정 버튼 제거, 가격·할인 탭 이름을 판매 설정으로 변경.
- 범위: product-detail.tsx, catalog 가이드 원문·대표 캡처, 디자인 문서·보드. root 구현/hold_ui 독립 검증.
- 계약: 상태 배지/도움말 유지. product-pricing 해시·tabpanel/키보드·판매 설정 폼·저장 API 변경 없음.
- 수용: PC1440/모바일390·320 상단 중복 버튼 없음·판매 설정 클릭·화살표 이동·해시 직접진입·넘침 없음. 쓰기 없는 UI 검증, 관련 타입/lint·가이드 검사.
- 복구: 탭명/중복버튼과 관련 문서만 복원. 선행 미커밋 작업 보존.

## 검증 결과 (2026-11-06)
- PC1440·모바일390/320: 중복 버튼 제거, 판매 설정 클릭·ArrowRight·product-pricing 직접 진입, 가로 넘침 없음 확인.
- hold_ui 독립 PC/320 검증 통과. 상태 배지·도움말 유지, 실제 쓰기 없음.
- typecheck·수정 파일 ESLint·가이드/보드 테스트9 통과.
- catalog 가이드 원문 및 catalog-detail.jpg 캡처 동기화. 증거: .local/wb210-sales-1440.png, .local/wb210-sales-390.png, .local/wb210-sales-320.png.
- API/저장 계약 변경 없음. 다음 작업은 사용자 추가 요청에 따름.
