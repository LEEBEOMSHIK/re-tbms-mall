# WB40 재고 출고 사유 관리 검증

R50 / docs/superpowers/plans/2026-10-26-movement-reasons.md. API inventory_api, UI inventory_ui, TS계약/문서/통합 조정 담당, 독립 inventory_review.

변경: services/api/app/inventory.py 및 사유/이관·초기입고 테스트; 웹lib/catalog.ts·movement-reasons.test.ts·catalogforms/list/css·manager. 요구/API/데이터/디자인/결정/보드.

## 증거

- 독립 API191개 통과(84.15초):모든사유부호/범위/권한/중복key사유변경409/동시판매경합/기존payload재시도/이관실패롤백/원장보존.
- 독립 웹50개·lint·typecheck·프로덕션빌드통과. 남은차단이슈없음.
- root Edge 모의API7사유(입고,판매,증정,불량폐기,기타,증가조정,감소조정) 양수수량→signeddelta 검증,503후동일요청key재시도/입력보존,완료제목포커스·사유·전후수량.
- 이력8건중gift필터1건/legacy필터1건 확인.320/390px목록페이지넘침없음. .local/movement-reasons-browser.cjs exit0.
- 실제BFF sale양수요청422,조회catalog전후동일. 성공쓰기는모의만사용.
- 실제DB 이관 전온라인백업 .local/catalog-before-v5-20261026-103156.sqlite3. schema5확인,기존 products2/skus1/movements1의전체기존컬럼값과원장request_payload동일. FK검사정상,기존원장legacy. 새출고/입고를실데이터로기록하지않음.

## 제한·복구

판매출고는수동재고기록이며주문/결제/정산미연결. 초기고정사유의사용자편집은미구현. 실제기기/전체보조기술미검증. 복구는앱중지후백업DB+이전코드쌍이며이관후쓰기발생시추가백업/이전전략없이덮어쓰지않는다. 커밋/푸시/배포없음.

