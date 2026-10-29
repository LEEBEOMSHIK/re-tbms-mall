# WB52 / R62 요약카드 내역 전환

- 구현 supplier_ui: catalog-list.tsx/catalog.css. 독립 supplier_review, 통합 조정.
- 상단4요약카드 native button/aria-pressed/controls/선택문구 적용. 중복보기nav제거. 조정기존은adjust_in/out/legacy 기록건수. 기존수량집계/필터전환 유지.
- Edge .local/inventory-summary-navigation-browser.cjs 통과: 4보기 해당heading/기록수1·2·3, 누계9/10/3개·조정3건, 중복nav없음/선택1개, Enter/Space, 사유초기화·검색유지·검색과독립누계.1440/768/390 라이트다크 확대글꼴 가로넘침없음.
- .local/inventory-summary-navigation.png 렌더링 확인. 합성데이터 조회만 사용, 사용자 저장없음.
- 독립 웹66개·lint(경고0)·type exit0. 차단결함없음. git diff --check exit0. API/빌드는 표시변경 범위에서 미실행.
- 데이터/DB/서버/외부서비스변경 없음. 복구는 이번 카드JSX/CSS만 되돌림.
