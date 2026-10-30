# WB123 / R111 고객 입력칸 스타일

2026-10-30, root 구현 / customer_account_review 독립 정적검토.

목적: 사용자가 지적한 배송지 이름과 나머지 입력칸의 모서리·테두리 불일치 수정. 원인은 account-label의 개별 규칙과 checkout-fields 시안용 4px/color-line 규칙 혼용, ds-form 미적용.
변경: customer-account.tsx, live-checkout.tsx, checkout/preview/preview.tsx에 공통 CSS import와 ds-form. customer-account.css/preview.css의 입력칸 개별 규칙 제거. form-controls.css의 선택적 font-size 토큰 추가(기존 미지정 inherit 유지), checkout-preview에1rem 지정. 공통 높이/반경/색상 계약 사용.

검증: scoped ESLint 및 workboard5 통과. 독립 검토에서 세 화면 적용·규칙 제거 확인. 검토 중 지적된 PC 상속 글자차이도 토큰으로 통일하고 브라우저 확인. 격리 합성계정의 PC1440/모바일390 배송지 등록7개 입력은 동일52px 높이/12px radius/16px 글자, 다크 동일border색 확인. 라이트 테마 시각 확인 및 focus2px 표시. 기본정보2개/주문서 시안4개 입력도 같은 computed값 확인. `.local/wb123-inputs-pc.png`, `.local/wb123-inputs-mobile.png` 캡처.
동작/API/DB 변경 없음: CSS 수정을 위한 추가 단위 테스트 및 저장API 재검증은 생략. 기존 인증/저장 흐름 보존. 관리자 가이드 영향 없음(고객 폼 스타일만). 디자인 시스템/보드 갱신. 복구는 이번 공통스타일 연결 변경만 되돌림, 기존 미커밋 변경 보존. 배포/커밋 없음.
