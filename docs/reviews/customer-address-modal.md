# WB125 / R111 주소 검색 모달

담당 root / 독립 검증 customer_account_review. 목적: 아래로 펼치는 검색 패널을 없애고 주소 선택에 집중하는 별도 창 제공.

범위·수정 파일: customer-shipping-fields.tsx 및 신규 customer-address-search.css, 기존 live-checkout.css의 인라인 검색 규칙 제거. 공유 ShippingFields를 사용하는 배송지·주문서에 적용. API/DB/저장 계약 변경 없음, 새 의존성 없음. 선행 WB124.

설계: native dialog의 중앙 PC 패널(최대560px), 모바일 화면 맞춤 패널과 고정 제목/닫기. 배경 스크롤 잠금, 검색 로딩·실패 재시도. 취소는 검색 버튼, 선택은 상세주소로 포커스 복귀. 늦게 도착한 스크립트/검색 콜백은 닫힌 요청에 적용하지 않는다. 카카오 검색 iframe은 원형으로 유지한다.

수용 기준·검증 계획: PC/mobile 실제 카카오 검색→선택→자동입력 및 상세주소 포커스, 닫기/재열기와 입력 보존, 모달 크기/가로 넘침/배경 잠금, 코드 정적 검사 및 독립 검토. 저장API는 변경하지 않아 기존 SaveResult/권한/서버계산 계약을 유지한다. 관리자 가이드 영향 없음: 고객 검색 UI만 변경하며 관리자 입력·업무·메뉴는 동일. 복구는 이번 TSX/CSS 변경만 되돌림. 검증 전 완료 선언 금지.

## 실행 결과 (2026-10-30)
- root 실제 격리 브라우저: PC1280×720에서 모달560×656/상하32px, 모바일390×844에서 화면 전체 크기. 배경 body overflow hidden 및 native :modal 확인. 캡처 `.local/wb125-address-pc.png`, `.local/wb125-address-mobile.png` 시각 확인.
- PC/mobile 카카오 실제 iframe 공개주소 세종대로110 검색/서울시청 선택→04524/서울 중구 세종대로110 자동입력, 상세주소 포커스, 닫힘과 배경 잠금 해제 확인. PC 닫기 버튼에서 Escape, 모바일 닫기 버튼 클릭, 재열기/취소의 주소 유지 및 검색 버튼 포커스 확인.
- customer_account_review 독립 코드 검토: async generation guard, 값보존/포커스, 잠금 복구, 반응형 규칙에 차단 이슈 없음. 독립 ESLint 종료0. root ESLint 및 TypeScript noEmit 통과.
- 신규 저장 동작 없음: 주소 선택은 입력만 갱신하며 실제 주소록 저장/주문 확정은 수행하지 않았다. 네트워크 차단/실패 재시도는 코드 검토만 수행했고 실제 장애 주입은 미실행. 실제 휴대폰 소프트 키보드/회전 테스트와 다크 모달 시각 검증은 미실행.
- 완료 판정 root: 요청한 인라인 제거와 PC/mobile 검색 모달 검증 완료. 디자인 시스템·보드 동기화, 관리자 가이드 영향 없음. 다음은 기존 PG 선정/운영 배송지역 자료 준비. 커밋·배포 없음.

## WB126 우편번호 오른쪽 검색 버튼 (2026-10-30)
R111, root 구현/customer_account_review 독립 검토. 사용자 요청에 따라 customer-shipping-fields.tsx에서 우편번호를 별도 label+입력/버튼 행으로 구성하고 customer-address-search.css에 flex gap8px를 추가했다. API/DB/저장·모달 동작 계약 유지, 선행 WB125. 수용 기준은 PC/모바일 같은 행 배치와 검색 모달/포커스 유지.
실제 격리 화면 PC1280/mobile390에서 입력·버튼 top 동일, 높이52px, 간격8px 실측. 모바일 가로 넘침 없음, 모달 열기/닫기 후 검색버튼 포커스 확인. 캡처 `.local/wb126-postcode-pc.png`, `.local/wb126-postcode-mobile.png`. 독립 검토에서 label 연결/type=button/disabled/기존포커스/여백규칙 충돌 없음 확인. 관리자 가이드 영향 없음(고객 공통폼 버튼 위치만 변경). 저장 기능 미변경으로 저장 API 재검증 생략. 복구는 이번 우편번호 JSX 및 row CSS만 되돌림. 다음 기존 PG 선정 과제 유지.
