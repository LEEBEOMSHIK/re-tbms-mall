# WB147 주문 검색 영역 축소

- R111 사용자 요청: 상세 필터 아이콘과 검색 영역 축소. root 구현/독립 customer_account_review. API·데이터 계약 변경 없음.
- 변경: admin-order-search.tsx, sales-orders.css, admin-guide/captures, 디자인 시스템 및 작업 보드. 기본 검색은 PC 한 줄, 모바일 두 줄. 항상 표시하던 설명/라벨 공간은 줄이고 접근성 label 유지. 상세 필터는 슬라이더 아이콘, title/aria-label/expanded/controls와 숫자 배지 제공. 필터 내용·검색/초기화 의미는 그대로 유지.
- 수용 기준: PC 약77px 검색 영역, 아이콘 열기/닫기·적용배지·조건 유지, 초기화, 모바일 넘침 없음. 가이드 아이콘 위치 표식 갱신.
- 실제 Chrome 3100 PC1600: 검색영역77.1px, 날짜 필터 적용 후 접힘과 숫자1 배지 확인. 초기화 확인. 독립 코드 검토 차단 없음.
- 캡처 `.local/wb147-compact.png`, `.local/wb147-expanded.png`, `.local/wb147-mobile.png`.
- 가이드 영향 sales-orders 0/1. 쓰기 저장 완료 패턴은 해당 없음. 복구는 해당 UI 변경 되돌림.

타입 검사·lint·가이드/캡처 테스트4개 통과. 모바일 검증용 viewport에서 DOM 가로넘침 없음 확인했지만 Chrome 캡처가 두 번 시간초과되어 모바일 시각 캡처는 미완료. viewport reset 호출. 새 가이드 자산/좌표 계약은 통과했으나 실제 가이드 렌더 시각 재확인은 남아 보드는 verification 유지.
