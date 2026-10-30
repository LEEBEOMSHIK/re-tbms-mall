# 고객 기본정보·배송지 주소록 (WB122 / R111)

선택적 재사용 정보. OAuth 프로필과 별도 `customer_contacts`에 이름/연락처를 보관하므로 소셜 재로그인이 고객 입력값을 덮어쓰지 않는다. 고객이 비워 저장할 수 있다. 주소록은 `customer_addresses`에 별도 저장하고 삭제 시 해당 행을 삭제한다. 삭제 전까지 재사용 목적으로 보관한다고 화면에서 안내한다. 구매 주문/주문서의 독립 사본과 보관 목적은 구분한다. 신규 관리자 조회 권한이나 마케팅 목적을 추가하지 않는다.

## API
- 인증 필수, 모든 읽기 no-store. 서버 인증 고객ID만 사용한다.
- `GET /api/v1/customer/account`: `{version,profile:{name,phone},addresses:[{id,label,shipping,is_default}]}`.
- `PUT /account`: `{version,request_id,name,phone}`. 이름 최대50, 연락처 최대20; 빈값 허용, 입력 시 국내전화 형식 검증.
- `POST /addresses`, `PUT /addresses/{uuid}`: `{version,request_id,label,shipping,is_default}`. label 1~30, shipping은 checkout 계약 재사용. 최대20개는 구현상 제한.
- `DELETE /addresses/{uuid}`: `{version,request_id}`. 타고객 대상은404. 삭제 후 기본 배송지를 임의로 다른 주소로 변경하지 않는다.
- 모든 변경은 고객정보 전체 version으로 원자적 경합 검사. 요청ID/해시로 재시도, 같은ID 다른내용409. 요청 기록에는 주소 원문을 남기지 않는다. 응답은 변경 후 Account, BFF에서 필드 정제·session_guard 추가. 모든 쓰기 Origin/Host·세션가드 적용.
- 첫 배송지는 기본, 이후 지정 가능. DB unique partial index로 고객당 기본주소 최대1개.

## 주문서 연결
생성 시 기본 주소의 값을 복사하며 참조로 연결하지 않는다. 주소록 변경/삭제는 기존 주문서에 전파되지 않는다. 기본주소가 없으면 직접 입력. 기본정보는 주소가 없는 입력폼의 이름/연락처 보조값이며 늦은 조회로 사용자가 작성한 내용을 덮어쓰지 않는다.
기존 주소 선택은 입력폼에 복사 후 주문서 저장으로 확정한다. `PUT /checkouts/{id}`의 `save_address`는 기본 false. true면 동일 트랜잭션에 배송지 추가(완전히 같은 내용은 재사용), 기존 주소 덮어쓰기 없음. 용량 초과 시 전체 변경 거부. 처음 추가하는 주소만 기본 지정. idempotency로 재시도 중복 방지.

## UI와 범위
WB127: 배송지 이름·받는 분·연락처·우편번호·기본주소·상세주소 필수, 배송 요청사항만 선택. 상세주소는1~100자이며 trim 후 빈값 금지. 주소록 등록/수정과 주문서 저장에 같은 서버 Shipping 검증을 적용한다. 기존 상세주소 없는 데이터의 조회는 유지하되 다음 저장 시 보완해야 한다. 프로필 기본정보의 선택 저장 정책은 변경하지 않는다.
WB130: `/account`는 로그인 계정 읽기 전용 정보와 배송지 목록을 통합 표시한다. `/account/profile`·`/account/addresses`는 `/account`로 redirect. `/account/addresses/new` 등록, `/account/addresses/{id}/edit` 수정 유지, 완료 후 `/account` 복귀. 별도 기본정보 수정 UI는 제거하되 기존 profile DB/GET/PUT 계약은 호환용으로 보존한다. 신규 배송지 수령인·연락처는 기본 배송지 우선, 없으면 기존 profile 사용. 기존 주소·기본지정·주문서 사본은 덮어쓰지 않는다. 상단 계정 메뉴에서 마이페이지·내 주문서로 이동한다. 수정 ID 변경은 컴포넌트 재마운트. SaveResult는 서버 결과·다음 동작·포커스 제공. 실패/충돌 입력 보존, 알 수 없는 결과는 동일 요청 재시도. 계정 변경 신호 발생 시 입력/개인정보 제거.
관리자 가이드 영향 없음: 고객 전용 메뉴/기능이며 관리자 원문/캡처 대상 없음. 회원탈퇴·법정 주문기록 파기 일정·운영 개인정보처리방침 최종 사업자 정보는 별도 운영 준비 범위다. 실결제/배송 가능 지역 판정은 WB121 경계를 유지한다.

복구: 신규 화면/라우트 등록을 되돌리고 additive 테이블은 보존. 기존 OAuth·카트·주문서 데이터를 삭제하지 않는다.
