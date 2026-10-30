# WB122 / R111 회원정보·배송지 검증

2026-10-30. 구현 root, 독립검증 customer_account_review.

## 변경과 계약
`services/api/app/customer_account.py` 기본정보/주소록·원자적 버전/요청 해시, customer.py 등록/복귀경로, checkout.py 기본 복사/선택 주소 저장. 웹 account 라우트5개, customer-account.tsx/css, ShippingFields, customer-account parser/BFF, 헤더 계정 링크와 checkout 연결. 계약 docs/contracts/customer-account.md, 계획 docs/superpowers/plans/2026-10-30-customer-account.md.

## 실행 증거
- API 초기 RED: 신규 account/addresses 경로404로3개 실패 → 구현 후9개(account3+checkout6) 통과.
- BFF 초기 RED: account guard/return 미지원2개 실패 → 구현 후2개 통과.
- API customer+checkout+account 통합50 passed. 이후 추가한 한도/선택해제/실패 원자성/재로그인/정보비우기 포함 account4 passed (`--basetemp=.local/wb122-account-boundary-tests`).
- 전체 API `pytest services/api/tests -q`: **637 passed**, 394.37초. 이 실행 수집 이후 추가된 경계 테스트는 위 별도4개 실행에 포함되며 전체638개 실행으로 표현하지 않는다.
- 전체 웹 `npm test`: **204 passed**. 최초 실행에서 WB122의 보드 검증 필드 누락1개 실패 → 보완 후 전체 재실행 통과.
- `npm run typecheck` 및 변경 TS/TSX·account routes 대상 ESLint 종료0. ref render 접근 및 CheckoutList 오치환 오류는 수정 후 재검증했다.
- 테스트 병렬 실행 시 기본 임시경로가 겹쳐 WinError32 발생한 추가 검증은 별도 basetemp로 분리해 재실행 통과. 실데이터 변경 없음. 전체 API 실행도637개 통과를 확인했다.
- 독립 검증: API9/웹2 통과. 지적된 주소ID 전환 재마운트 key와 checkout 선택주소 저장 완료 문구를 보완. 새 ID page key 및 최종 타입/lint 확인.

## 실제 UI
격리 API8121/웹3121, 별도 합성 DB `.local/wb122-qa`와 QA 전용 로그인. 운영 로그인 우회 코드는 배포 소스에 없음.
- PC1440×1000: 기본정보 저장→완료 포커스→마이페이지 서버값→배송지 등록 이름/전화 자동 채움→주소 저장/목록 확인.
- 새 주문서: 기본 주소 자동 복사, 받는 분 변경+주소록 저장 선택→주문서와 주소록 저장 완료 문구 확인. 주소록에2개 표시 확인.
- 모바일390×844: 수정 폼·기존값, 잘못된 전화422 후 배송지명/입력 유지, 전화수정→기본지정→서버 완료값·포커스 확인. 목록에서 기본주소1개 확인, 확인단계를 거쳐 합성 기본주소 삭제→완료 포커스·남은주소에 임의 기본지정 없음 확인.
- PC/모바일 시각 확인, 캡처 `.local/wb122-addresses-pc.png`, `.local/wb122-addresses-mobile.png`, `.local/wb122-address-edit-mobile.png`.
- 기존 로컬 API8100 재시작, 웹3100 `/account` 200 및 비인증 `/api/v1/customer/account` 401 확인.

## 제한/복구
관리자 가이드 영향 없음: 고객 전용 마이페이지/주문서 변경, 관리자 메뉴/업무·캡처 변경 없음. 공통 SaveResult와 별도 목록/입력 URL 사용. 기본정보/주소록과 주문서 사본 분리. PG·재고예약·법정 주문기록 보존/회원탈퇴 구현은 범위 밖. 운영 개인정보처리방침의 사업자 정보 확정은 별도 준비 필요.
복구는 신규 화면/라우트 등록을 되돌리고 additive DB 테이블 보존. 기존 미커밋 작업 유지, 커밋/푸시/배포 없음. 합성 검증 산출물은 .local에만 보관.
격리 검증 서버3121/8121 종료, 기본 웹3100/API8100 유지. 임시 화면 크기 초기화 및 검증 탭 정리 완료.
