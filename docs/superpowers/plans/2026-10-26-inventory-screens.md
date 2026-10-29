# WB36 재고 이력·입력 화면 분리

R46 / 2026-10-26. /admin/catalog/inventory는 재고 변경 이력 목록 전용, /admin/catalog/inventory/new는 입고·조정 입력/완료 전용으로 분리한다. 목록의 등록 버튼→입력→완료→이력 복귀를 제공한다. 폼 아래 이력/목록과 목록 위 작성폼을 함께 두지 않는다.

root manager/forms/newpage·문서 구현, inventory_review 독립검증. 선행WB35. API/DB 변경없음. 수용: 목록에movement-form없음/입력에movement-history없음, 양방향링크/완료이력링크/보호라우트/빈목록·오류·모바일·완료회귀. 디자인/AGENTS/템플릿에서 향후 관리화면 목록·등록·수정 분리검증필수. 다른 기존 기준정보 화면까지 소급완료로 표현하지 않는다. 복구코드되돌림.
