# WB127 / R111 배송지 필수값 검증

root 구현 / 독립 검증. 배송지 이름·받는 분·연락처·우편번호·기본주소·상세주소 필수, 요청사항만 선택으로 표시한다. 프로필 기본정보 선택 저장 정책은 그대로 유지한다. 사용자 명시 요청에 따라 상세주소 누락/공백을 서버에서도 거부한다.

범위: Shipping 모델 공유로 주소록 등록/수정 및 주문서 저장 적용. 기존 DB 값은 자동 변경하지 않고 읽기 유지, 이후 저장 시 필수값 보완. 수정 파일은 checkout.py, customer-checkout.ts, customer-shipping-fields.tsx, customer-account.tsx, customer-address-search.css 및 관련 테스트/문서. 새 의존성 없음. 수용 기준은 필수 누락/공백/잘못된 전화·우편번호 저장 차단, 첫 오류 포커스/항목별 안내·입력 보존, 보완 후 저장과 SaveResult 확인.

검증 계획: 서버 직접 요청 실패 시 상태/버전 불변 및 수정 성공, 웹 검증 함수 경계 테스트, PC/mobile 실제 입력·저장 흐름. 관리자 가이드 영향 없음(고객 폼·공유 고객 API만). 복구는 이번 필수 검증 변경만 되돌림, 기존 데이터 삭제/마이그레이션 없음.

## 실제 결과 (2026-10-30)
- API `pytest tests/test_customer_account.py tests/test_checkout.py -q`:14 통과. 신규4경계는 상세주소 누락/빈값/공백/101자를 주소록 생성·수정 및 주문서 저장에서422로 거부하고 버전/데이터 불변 확인, 유효 상세주소 trim 저장 확인. 샌드박스 실행은 지연되어 종료했고 로컬 권한 재실행에서8.52초 통과.
- 웹 검증/BFF/계정/주문서/보드12 통과, ESLint/TypeScript noEmit 통과. 초기 TSX 구문 오류는 수정 후 재검증했다. customer_account_review 독립 정적 검토 및 검증 함수2건 실행 통과.
- 합성 계정 PC1280/mobile390에서 필수표시, 빈값 및 상세주소 공백 저장 거부, 기존 입력 보존 확인. 상세주소 보완 후 서버 SaveResult에 저장된 주소와 목록 복귀 링크, 완료 제목 포커스 확인. 모바일 첫 오류 입력으로 중앙 스크롤 보강 후 실제 top395.9/height52/viewport844 확인.
- 증거 `.local/wb127-required-pc.png`, `.local/wb127-required-mobile.png`. 주소 검색/PG/실주문 동작 변경 없음. 사용자 실제 데이터 변경 없음. 자동 리로드 없는 기존 개발 API8100은 동일 실행명령으로 재시작하여 적용, 시작 완료 로그 확인.
- 디자인 시스템·요구사항·결정·API 계약·보드 동기화. root 통합 완료 판정, 관리자 가이드 영향 없음. 다음 기존 PG선정 및 배송지역 자료 과제 유지. 배포/커밋 없음.

## WB128 기존 필수 표시 규칙 준수
사용자 지적에 따라 docs/design-system.md:139의 기존 규칙을 적용한다. WB127에서 임의로 추가한 (필수) 문구 및 고객 디자인 문서의 상충 규칙을 수정했다. 공통 FormLabel 별표·FormRequiredHint 사용, 배송지 이름 포함 안내는 폼당1회. customer-shipping-fields.tsx/customer-account.tsx/customer-address-search.css 및 고객 디자인 문서/보드 수정. API/검증/저장 동작 변경 없음.
PC1280/mobile390 실제 페이지에서 별표6개/실제required6개/안내1개/별표aria-hidden 확인. 모바일 라벨 가로 배치 및 가로 넘침 없음. 캡처 `.local/wb128-required-pc.png`, `.local/wb128-required-mobile.png`. 독립 정적검토·ESLint·TypeScript 통과. 표시만 수정하므로 저장/API 재검증 생략, 관리자 가이드 영향 없음. 복구는 이번 공통 라벨 연결 변경만 되돌림. WB128 완료.

## WB129 연락처 입력 제한
R111/root. 기존 저장 검증은 숫자 정리 후 `^0\d{8,10}$`이나 입력칸 maxlength20이라 긴 값이 입력 가능했다. 공유 ShippingFields를 numeric 키패드/maxlength11 및 phoneDigits 정규화로 수정했다. 서식 있는 번호 붙여넣기는 원문을 읽고 숫자로 정리한 후 현재 선택 구간에 넣어 하이픈 때문에 maxlength가 뒷자리를 자르는 문제를 방지한다. 저장 정규식/API는 변경하지 않았다. 대상 TSX/공유 lib/경계 테스트/디자인 문서/보드 변경. 관리자 가이드 영향 없음. 수용 기준은 숫자11자리 제한과 기존 저장 검증 유지, 검증은 함수 경계/정적 분석이며 실제 브라우저 타이핑 검증은 이번에 미실행. 복구는 phoneDigits 및 입력 핸들러 변경만 되돌림.
독립검토에서 부분선택 붙여넣기가 기존 뒷번호를 자르는 경계를 발견하여 pastePhoneDigits로 기존 앞/뒷번호를 보존하고 남은 자리만 삽입하도록 수정했다. 전체선택 하이픈 번호 및 부분선택 초과 붙여넣기 테스트 추가 후3/3, 보드 포함8/8 통과. ESLint/TypeScript 재검증 통과. 적용 범위는 배송지·주문서 연락처이며 별도 마이페이지 기본정보 폼은 이번 변경 대상이 아니다.
