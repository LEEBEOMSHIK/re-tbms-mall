# WB46 공급처 상세 정보

R56. 사용자는 전화번호·대표자명·공급처 영문명 등 운영에 필요한 정보 확장을 요청했다. 기본정보/연락처/주소·메모로 묶고 공급처명 외 추가 항목은 선택 입력한다. 추가 선택 필드는 구현 제안이며 영업·정산 정책을 확정하지 않는다.

## 계약·소유

필드: english_name120, representative_name80, phone40, business_number40, contact_name80, contact_phone40, email254, postal_code20, address240, address_detail240, memo1000. 숫자는 최대 글자 수. 문자열 trim, 기본 빈 문자열, null 거부. 이메일은 비어 있거나 기본 주소 형식, 전화는 국제 번호의 +/공백/괄호/하이픈/점과 숫자를 허용한다. 사업자번호는 기록용이며 검증·사업자 인증을 의미하지 않는다. 외부 주소 검색이나 유료 연동 없음.

- inventory_api: services/api 스키마7·CRUD·테스트. PUT 누락 추가 필드는 기존 값 보존, 명시 빈 문자열은 삭제. name/active/version 계약 유지.
- inventory_ui: 공급처 화면·전용 CSS·catalog supplier 계약 및 parser/tests.
- 조정: 문서·작업 보드·브라우저·실제 이관 보존 비교.
- inventory_review: 독립 소스·API/웹/lint/type/build.

## 수용·검증

추가항목 저장/조회/수정/clear, 누락/빈/공백/null/최대길이/이메일/전화 형식/버전충돌/인증, 이전 공급처·원장 보존. UI 실패 입력 유지·완료, 목록과 등록 분리, 그룹간 간격, 모바일·다크·확대글꼴. 합성 데이터만 테스트에 사용한다. 연락처는 관리자 인증 뒤 조회하고 로그/작업 보드에 실제 개인정보를 기록하지 않는다.

백업: .local/catalog-before-v7-20261026-131144.sqlite3 schema6 integrityok. schema7은 공급처에 열만 추가하고 이전 데이터와 version을 유지한다. 복구 시 서버 정지 후 백업과 호환코드를 함께 복원하며 백업 후 새 데이터는 별도 보존한다.
