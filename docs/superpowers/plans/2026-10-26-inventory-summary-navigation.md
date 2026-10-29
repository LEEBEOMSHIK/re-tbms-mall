# WB52 / R62 요약카드 내역전환

- 목적: 요약 숫자와 중복 보기버튼을 하나의 인터랙션으로 통합.
- 범위/담당: supplier_ui catalog-list.tsx/catalog.css, supplier_review 독립, 조정 docs/workboard/browser. API/DB 없음.
- 계약: 현재재고/입고/출고/조정기존4카드 native button, aria-pressed와 시각적선택. 기존 view전환과 사유/공급처필터 초기화, 검색유지. 하단 중복 nav제거. 조정기존은 건수(수량과 구분), 전체누계의 검색독립성 유지.
- 수용검증:4카드 클릭과 Enter/Space, 해당 목록과 헤딩, 정확한 누계와 조정건수/미분류포함, 검색유지/사유필터초기화, 모바일다크확대·포커스. 웹test/lint/type 및 Edge 합성기록.
- 복구: 이번 요약카드 JSX/CSS만 되돌림. 데이터/업무로직 유지.
