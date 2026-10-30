# WB122 회원 기본정보·배송지 주소록 구현 계획

목적/R111: 승인된 마이페이지 → 내 정보/배송지 관리 → 주문서 자동 불러오기 구현. 담당 root, 별도 최종 검증자. 기존 Next/FastAPI/customer DB와 공통 SaveResult 사용. 새 의존성/PG 없음.

설계: OAuth 이름/이메일은 읽기 전용 계정 정보, 고객이 입력하는 이름/전화는 별도 기본정보. 주소록 최대20개(구현상 제한), 첫 주소 기본 지정, 이후 선택 변경 가능. 기본 삭제 시 다른 주소 자동선택 없이 기본 없음. 주문서 생성 시 기본 주소 복사, 기존 주문서는 변경 안 함. 회원정보·주소록은 등록 선택이며 언제든 비우기/삭제 가능. 기본정보가 없더라도 주문서 직접 입력 가능.

대안: 최근 주문서 자동 재사용은 선물 배송지 오사용 위험이 있어 채택하지 않음. 회원이 지정한 기본 주소록을 새 주문서에 복사한다. 이전 대화에서 제안한 이 흐름으로 사용자 실행 승인 받음. 저장 데이터는 재사용 목적, 삭제 전까지 저장, 주문서 사본 별도 안내. 마케팅/실명인증/회원탈퇴 새 정책은 범위 밖.

계약: /api/v1/customer/account GET/PUT {version,request_id,name,phone}. /addresses POST, /addresses/{uuid} PUT/DELETE. 주소 쓰기 {version,request_id,label,shipping,is_default}; 삭제 Mutation. 통합 응답 {version,profile:{name,phone},addresses:[{id,label,shipping,is_default}]}. 버전은 계정 전체, idempotency는 해시만 보관. 인증 소유자만; BFF session guard. checkout PUT save_address 선택 추가, 같은 트랜잭션에 주소 추가/정확히 같은 주소 재사용. checkout 생성 기본주소 복사. /account, /account/profile, /account/addresses, /account/addresses/new, /account/addresses/{id}/edit. OAuth return allowlist 확장.

1. [x] API 회귀 실패 테스트(소유권, 중복/경합, 기본주소 유일성/삭제, 입력검증, 초안 사본독립, 선택저장) → account.py 구현/checkout연결 → pytest.
2. [x] BFF parser/guard 실패 테스트 → customer-account.ts/라우팅 → 테스트. 마이페이지 목록/별도 입력화면, 헤더 진입, 공통 ShippingFields 주소검색, 주문서 선택·저장 체크박스.
3. [x] 타입/lint/테스트, 격리 합성데이터 PC/모바일 저장·수정·삭제·실패·계정분리 검증. 독립 코드 검토.
4. [x] 계약/요구/결정/디자인/보드/검증 기록. 관리자 가이드 영향 없음(고객 화면만). 기존 변경 보존, 커밋/배포 없음.

검토 초점: 다른 계정 데이터 표시/전송 금지, 재로그인 OAuth가 입력정보 덮어쓰지 않음, 기본주소 중복 금지, 늦은 응답/중복/새로고침 실패 입력 보존, 주소 변경이 기존 주문서에 전파되지 않음. 복구: 신규 라우트/등록 제거, additive DB는 보존.

검증/조정 기록: docs/reviews/customer-account.md. 사용자 진행 승인 범위 내 직접 구현, 기존 작업 보존을 위해 커밋/워크트리 변경 없음. 주소 ID key 재마운트와 선택저장 완료 문구 보완.
