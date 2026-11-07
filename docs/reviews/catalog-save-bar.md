# WB220 하단 저장 액션
R107. 관리자 UI/독립 검증. 상품 신규·기본정보, 옵션 초기재고 등록, 입출고·조정, 가격공개 설정에 공통 catalog-save-bar 적용. 같은 폼의 원래 버튼을 sticky bottom0으로 배치하며 복제하지 않는다. 문서 흐름/fieldset disabled/validation 유지. 완료 분기에는 바 없음. 모바일 safearea 하단 여백과48px 제출 버튼. 높이500px 이하에서는 sticky 해제하여 키보드/가로모드 입력 가림을 줄인다.
변경: catalog-forms.tsx/publication-editor.tsx/catalog.css, 디자인 문서·가이드 catalog/inventory 원문 및 영향 캡처. API/DB 변경 없음.
수용: PC1440/모바일390/320 스크롤상태 버튼 위치·최종textarea 접근·낮은뷰포트·입력실패 보존·완료 분기. 실제쓰기 없이 합성 응답 사용. 복구는 WB220 UI 변경만 되돌림.

검증결과: 타입/변경TSX lint/가이드4/diffcheck 통과. 재고1440/390/320에서 하단 바 위치, 마지막textarea 접근,450px높이static 통과. 독립1440/320 상품·옵션·판매설정 sticky와450pxstatic/문서넘침없음 확인. 판매설정 합성422입력유지→최신조회유지→합성성공 SaveResult/visible바0 통과. 실제쓰기 없음. 상품/옵션 개별 저장요청 모의는 미실행(기존 완료분기 유지), 실제 모바일 OS 키보드는 미검증이며 낮은뷰포트로만검증.
가이드 catalog:3/4, inventory:1 실제캡처 및좌표갱신. catalog:1 기존상단이미지의 대상은 이동없음. 원문 catalog/inventory 하단액션설명추가.
증거 .local/wb220-ui.cjs/.local/wb220-independent.cjs, .local/wb220-inventory-1440.png/-390.png, .local/wb220-independent-options-320.png.
