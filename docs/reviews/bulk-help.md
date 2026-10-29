# WB39 공통 도구 위치·도움말 검증

R49 / docs/superpowers/plans/2026-10-26-bulk-help.md. root forms/css·문서,inventory_review독립검증.

- 상품·색상·사이즈 뒤/조합표 전 DOM순서 확인. 긴설명은Tooltip?제목옆,개수/오류/결과유지.
-별도 sibling bulk-inputs 폼소유권 확인, 중첩form없음. 미적용공통invalid가저장막지않는기존회귀통과.
-Edge 도움말focus/hover/Escape,터치탭과390pxTooltip화면안표시 확인.320/390px페이지넘침없음.
-기존공통입고·부족기준독립성,적용경계/제외보존/개별수정/저장실패보존/완료회귀통과. .local/bulk-help-browser.cjs 최종exit0. 성공쓰기는모의만.
-독립lint·typecheck·소스검토통과. 작은UI구조변경으로build/API테스트미반복. 실제기기/전체보조기술미검증.

복구는UI코드되돌림이며데이터변경없음. 커밋/푸시/배포없음.
