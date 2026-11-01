# WB142 / R105 상품 상세 옵션 표시 통일

2026-11-01 root 구현, customer_account_review 독립 검토.

목적: 카드에 적용한 색상칩·사이즈 표시가 상세 선택 버튼에는 빠져 있었던 불일치 수정. 상품 상세·카드 공통 표시 helper, 상세 CSS, 디자인 시스템과 작업 보드만 변경. 관리자/서버/API/DB 계약 변경 없음.

수용:26px 링 칩+영문명, 알파벳 사이즈 사각 배지, 선택·품절·미선택 안내·키보드 포커스,44px 터치영역,PC/모바일 넘침 없음. 원래 옵션 식별자와 로그인 복귀·SKU 선택은 보존. 미지정/사용자 정의 값은 원문 유지.

파일: apps/web/src/components/shop-product-detail.tsx, product-option-preview.tsx, shop.css, apps/web/src/lib/product-option-labels.ts, apps/web/tests/color-chip.test.ts. 기존 UI 스타일 수정이며 저장 화면이 아니므로 SaveResult 해당 없음. 관리자 사용가이드 영향 없음(고객 상품 상세 표시만 변경).

검증: 관련웹13·TypeScript·변경파일ESLint 통과. 실제PC1280 Red/S선택 및M품절 선택 후 바로구매 차단/안내 확인(주문생성없음). 모바일390 가로넘침없음, 색상44px/사이즈48px너비 및44px이상높이 확인. 캡처 .local/wb142-detail-pc.png / .local/wb142-detail-mobile.png 시각확인. 새로고침 후 미선택 담기에서 색상 선택 안내, 색상만 선택 후 바로구매에서 사이즈 선택 안내 확인. Tab 이동으로 S 버튼 실제 포커스 및 solid outline 확인. customer_account_review 독립 코드검토 차단없음·관련테스트8 직접실행 통과. 브라우저 검증은 root 수행 결과로 구분한다.

복구: 이번 상세표시/CSS와 helper추출만 되돌림. 옵션 데이터·재고·주문·계정 상태 변경 없음. 기존 다른 작업의 미커밋 문서와 next-env 생성변경 보존.
