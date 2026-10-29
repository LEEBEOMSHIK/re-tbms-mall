# WB34 옵션별 부족 기준과 일괄 적용

R44 / 2026-10-26. 신규 색상·사이즈 각 조합에 재고 부족 표시 기준을 입력하고 공통값을 현재 등록 대상에 명시적 일괄 적용한다. 공통값 변경만으로 행을 수정하지 않는다. 적용 후 행별 수정 가능. 기존/제외/선택에서 빠진 조합은 적용 대상에서 제외한다. 나중에 추가한 조합은 기본0, 상품 변경은 입력 초기화. 초기입고/제외 상태 보존, 완료 결과에 실제 기준 표시.

계약: selected-batch items에 reorder_point optional strictint0..1000000. UI는 모든item에 전송하고 top공통필드는 생략. 기존 클라이언트 호환으로 item없으면 top reorder_point(default0) 사용하며 item0은 override한다. 기존 SKU는 재고/기준/원장 모두 불변. API 원자성/재시도 유지. DB변경없음.

소유: API inventory_api services/api; UI inventory_ui catalogforms/css; 조정 lib/catalog·테스트·문서·브라우저; inventory_review 독립검증. 선행WB33. 수용: 행별다른값/일괄후수정/0/최대/오류/적용범위/수량보존/상품격리/완료/중앙정렬/모바일 및 서버strict/호환/기존값보존. 합성DB와모의브라우저만성공쓰기. 복구코드되돌림, SKU재고/원장삭제없음.
