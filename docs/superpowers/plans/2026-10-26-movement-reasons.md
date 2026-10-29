# WB40 출고 사유와 재고 원장 분류

R50 / 2026-10-26. 판매/증정(지인제공)/불량폐기/기타출고 구분을 제공한다. 입고·출고·조정 선택과 양수수량입력으로 부호실수를 줄이고 서버가사유별부호검증. reason_code receipt/sale/gift/disposal/other_out/adjust_in/adjust_out/legacy. 기본legacy는이전클라이언트호환,기존기록은추론분류하지않는다. 새UI는명시code. reason상세메모필수유지. 판매출고는재고기록이며주문/결제/정산자동연동아님.

schema4→5 movements.reason_code추가 defaultlegacy,기존모든필드/원장재시도payload보존. canonicallegacy는새필드제외/nonlegacy포함. 초기입고새기록receipt. 중복요청/버전/음수재고금지기존계약유지. onlinebackup .local/catalog-before-v5-20261026-103156.sqlite3(상품2SKU1원장1).

소유 API inventory_api;UI inventory_ui forms/list/css;root TS/manager문서통합;inventory_review독립검증. 수용:모든사유/부호/범위/재시도키/경합/원장보존/필터/완료/모바일. 합성DB/모의UI성공쓰기,실DB이관후보존확인. 복구앱중지후백업+이전코드쌍,이관후쓰기시추가백업/이전전략없이덮어쓰지않음.
