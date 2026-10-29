# WB74 / R84 기존 옵션 부족기준 수정

- 사용자 확인: 신규등록이 아니라 기존옵션의 부족표시기준 수정이 목적.
- 담당: root 목록/BFF/문서/통합, supplier_api 서버, supplier_ui 별도수정화면, supplier_review 독립검증.
- 파일 계약: API inventory.py/main.py/tests; UI reorder-point-editor.tsx 및 inventory/[id]/threshold/edit/page.tsx; root 기존catalog-list/forms 및 BFF.
- API: PUT /api/v1/admin/skus/{id}/reorder-point {reorder_point:int0..1000000,version:int} →fullSKU, version+1. CAS409,missing404,auth. 실제재고/원장불변. BFF 기존인증/Origin검증.
- 화면: 재고현황→부족기준수정→SaveResult→상품필터재고현황. 입력에 전체목록/이력없음. 신규등록화면은 목적/진입안내 및 대상0일때 공통입력 비활성.
- 수용: 저장확정결과/다음동작/모바일완료포커스, 실패입력보존/불확정중복방지, 성공후조회실패구분, 직접URL인증, 화면분리. 모든쓰기검증은 모의API 또는 격리DB.
- 검증: API경계·충돌·권한·재고불변, 타입/lint, 브라우저 저장/실패/조회실패/모바일/목록분리. 기존실데이터변경금지.
- 복구: 추가route/UI/API만복원. DB스키마변경없음, 이미저장한 기준값은 자동복원하지 않음.
