# 게시 상태 컬럼과 상세 사유 검증

2026-10-26 / WB29 / R39
계획: docs/superpowers/plans/2026-10-26-publication-column.md

inventory_ui는 준비 상태의 미게시 표시를 별도 게시 상태 컬럼으로 옮기고 배지+짧은 사유+공통 Tooltip을 구현했다. 조정 담당은 계약/문서·브라우저·접근성 이름 보완을, inventory_review는 독립 검토를 맡았다. 현재 모든 상품의 게시 기능 미연결을 상세에 명시하며 옵션/재고 현황을 별도로 설명한다. partial 상태를 새로운 전상품게시차단 정책으로 만들지 않았다. API/DB 변경 없음.

Edge .local/publication-column.cjs exit0: 두 컬럼 분리,4상태의hover·설명포인터이동·focus·Escape·바깥클릭,320/390px최대글씨상세경계,집계누락설명,실제터치에뮬레이션tap/바깥tap 확인.320×300px에긴상품명을넣어실제설명overflow를만들고 End에서scrollTop양수/Home에서0을확인했다.1440px팝업캡처를직접검토했다.

독립검토에서 visible문구가aria-label에포함되도록제안되어상품명+게시불가+짧은사유로보완했다. 공통툴팁은body portal/fixed로표영역잘림을피하고aria-describedby를연결하며텍스트만포함한다. 삭제회귀(.local/product-delete-ui.cjs)도exit0으로취소/연결보호/충돌/불확실응답/성공후조회실패/모바일을확인했다. 실제상품쓰기/삭제없음.

고객게시연결은현재미구현이며실제게시기능도입시서버계약으로교체해야한다. 복구는이번UI/문서만되돌린다. 전체보조기기인증을주장하지않는다.

독립최종lint·타입검사exit0,작업보드파서5개통과. API테스트/프로덕션빌드는표시변경범위로반복하지않았다. WB29완료로기록했다.
