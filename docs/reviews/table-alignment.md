# WB33 재고 기준·중앙 정렬 검증

R43 / docs/superpowers/plans/2026-10-26-table-alignment.md. 조정 담당 구현, inventory_review 독립 검증.

- catalog-forms.tsx: 재고 부족 표시 기준·0/5 예시·신규 공통 적용 설명과 aria-describedby.
- catalog-list.tsx: 동일 열 이름. API/비교 규칙 변경 없음.
- catalog.css: 관리 표 middle 기본, 원장top 예외, 행별 수량 접근성 라벨 숨김 및 셀 위치 기준.
- 독립 소스 검토·lint·typecheck 통과.
- Edge computed th/td middle, 입력 중심과 행 중심 차이2px미만, 접근성 설명 연결 확인.
- 숨김 라벨의 위치 기준 누락으로 모바일 넘침 발견 후 셀 position:relative로 수정. 최종320/390px 페이지너비 일치. 모의 제외/복원/개별수량/실패보존/완료흐름도 통과.
- 실제BFF 읽기/실패요청은catalog전후동일, 성공쓰기는모의. .local/alignment-browser.cjs 실행 exit0.
- UI 문구/CSS 변경으로 API테스트·전체빌드는 재실행하지 않음. 실제기기/전체보조기술 미검증. 복구는 해당문구/CSS되돌림. 커밋/푸시없음.
