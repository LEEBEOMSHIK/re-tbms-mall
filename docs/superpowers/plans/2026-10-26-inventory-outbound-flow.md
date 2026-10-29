# WB55 / R65 재고 등록 진입·출고 통합

- 원인/목적: 하단 등록카드는 기록수가 늘수록 멀어지고 판매/기타출고는 같은 출고업무를 중복분리한다.
- 범위: catalog-list/forms/manager/css, inventory/new/page, flow helper/tests. supplier_ui 구현, supplier_review 독립, 조정 문서/브라우저.
- 계약: 목록위 컴팩트 입고등록/출고등록/재고조정. 출고 내부사유 sale/gift/disposal/other_out, 조정 adjust_in/out, 입고 receipt. 서버 reason_code/원장/부호계약 동일. 기존 customer URL은 out sale, other는 out gift 호환. 입력옵션/수량/메모 보존, 흐름 바뀌면 허용사유 기본값 적용. 재시도ID/중복방지/저장후목록 이동 유지.
- 수용: 다수행에서도 작업이 표앞, 출고4종음수·조정증감·입고양수, 0/초과/실패/재시도, 이전링크, 모바일/키보드, 독립테스트. 모의쓰기만 사용.
- 복구: 이번 UI/helper/route만 복원, DB/새의존성 없음.
