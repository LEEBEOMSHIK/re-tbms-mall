# WB36 재고 목록·입력 화면 분리 검증

R46 / docs/superpowers/plans/2026-10-26-inventory-screens.md. 조정 담당 구현, inventory_review 독립검증.

변경: catalog-manager.tsx, catalog-forms.tsx, inventory/new/page.tsx. 이력 /admin/catalog/inventory, 입력/완료 /admin/catalog/inventory/new. 디자인시스템/AGENTS/개발절차/작업·검증템플릿/요구·결정/보드에 분리 기준 반영.

- Edge 모의API: 빈 이력 목록에 form없음→등록 링크로/new 이동→입력에history없음.
- 입고/감소 완료에history없음, 완료 이력 링크로 목록 복귀 후2건확인/form없음.
- 신규URL 미인증 접근로그인리다이렉트.320/390px 입력/완료·390px목록 페이지넘침없음.
- WB35 실패입력/동일재시도키/확정전후수량/조회실패차단/복구/계속입력포커스 회귀통과.
- .local/inventory-screens-browser.cjs exit0. 실제 재고쓰기없음.
- 독립 웹48개·lint·typecheck·프로덕션 빌드 통과. 신규 /admin/catalog/inventory/new 라우트 포함, 남은 차단 이슈 없음.

API/DB변경없어API테스트반복안함. 실제기기·전체보조기술미검증. 이번적용은재고화면이며기존기준정보관리전체를소급분리한것은아님. 복구는화면라우트/링크되돌림,재고·원장삭제없음. 커밋/푸시/배포없음.

