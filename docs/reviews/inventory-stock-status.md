# WB58 / R68 재고 상태 배지

- 목적/범위: 재고목록 부족빨강/양호초록. StatusBadge low_stock/stock_healthy 및 라이트/다크danger토큰, catalog-list 표 적용. 조정 구현, supplier_review 독립. 계약: 기존 on_hand<=reorder_point 판정, 기준수량설명 유지. 데이터/API변경없음.
- Edge .local/inventory-stock-status-browser.cjs:0/0·2/2 부족2개,3/2 양호1개, 적색/녹색 RGB구분·문구, 라이트/다크텍스트대비 최소5.91:1,390폭문서넘침없음 통과. 합성조회만 사용. .local/inventory-stock-status.png 렌더링 확인.
- supplier_review 독립 코드 검토: 차단 결함 없음. npm run lint(경고 없음), npm run typecheck 모두 종료 코드 0. 기존 상품 준비 상태 배지와 강제 색상 모드 보존 확인. 단위/API/빌드는 표시 변경 범위로 재실행하지 않음.
- 디자인시스템/요구/작업보드 갱신. 복구는 이번배지/토큰/적용부분만복원,기존미커밋보존.
