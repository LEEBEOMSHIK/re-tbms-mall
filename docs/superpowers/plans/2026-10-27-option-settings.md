# WB76 / R86 옵션 사용 상태와 기준 수정

- 승인 범위: 상품 상세 옵션의 사용 상태 표시, 별도 수정에서 사용 여부와 부족 기준 저장. 비활성 전환에도 재고·이력 유지.
- 담당/파일: root lib/catalog 파서·상세/재고목록·문서, supplier_api 서버/schema/tests, supplier_ui 옵션수정/BFF/이전URL호환, supplier_review 독립검증.
- 계약: PUT /api/v1/admin/skus/{id}/settings {is_active:bool,reorder_point:int0..1000000,version:int0..2147483647}; fullSKU is_active bool, version+1. atomic CAS, 관리자만. 기존 threshold API는 상태 보존.
- DB: schema12 additive is_active INTEGER NOT NULL DEFAULT1 CHECK0/1. 기존·신규 활성, 재고/원장/ID 보존. 실패시 트랜잭션 롤백. 다운마이그레이션 하지 않고 이전앱 호환 컬럼을 유지한다.
- UI: /admin/catalog/options/{id}/edit; 상품상세 옵션목록 사용중/사용안함 표시, 옵션수정 링크. 공통 SaveResult 상태/기준 전후·재고불변·상품상세복귀. 과거 threshold/edit는 새URL로 인증 후 redirect.
- 비활성 옵션도 목록/입출고/조정에 남긴다. 기존 판매·주문 연동 없음; 판매 기능 구현 때 비활성 선택제외는 별도 검증. 색상/사이즈 식별값은 변경하지 않는다.
- 수용/검증: 서버 strict타입/충돌/권한/마이그레이션/비활성 재고유지·이동·재활성, 프론트 파서, 타입/lint, 브라우저 모의쓰기 실패보존/완료/재조회실패/모바일/직접URL인증. 실제 재고 쓰기 금지.
- 선행: WB75 상품상세 중심 흐름. API 계약 먼저 공유.
- 복구: UI/API 변경만 복원, 추가컬럼 유지; 실제 사용상태 임의 초기화 금지.
