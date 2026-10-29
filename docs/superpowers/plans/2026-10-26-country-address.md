# WB47 국가별 주소 입력·국내 검색

R57. 사용자 확정: 국가 먼저, 국내 검색과 직접 입력 모두, 해외 직접 입력, 기존 주소 유지. 국가 미지정은 기존값으로 보존하고 대한민국으로 추론하지 않는다.

## 구현·계약

country_code(default'', 알려진 ISO alpha2), region/city(각120)를 공급처에 추가한다. 기존 postal_code/address/address_detail을 그대로 주소1/2에 사용한다. PUT 누락 보존/명시빈값 삭제, 국가변경 시 다른 필드 자동삭제 금지. catalog.country_codes는 서버 허용 목록이다. UI는 Intl.DisplayNames로 국가명을 제공하며 알 수 없는/미지정 기존값을 임의 국가로 바꾸지 않는다.

국내 검색은 카카오 우편번호 공식 https://postcode.map.kakao.com/guide 를 확인(2026-10-26)하여 https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js 및 kakao.Postcode.embed를 사용한다. 키·유료 계약 없는 구현 선택이다. 클릭 시만 로드, 조회 실패/차단/취소 시 직접 입력 가능. 공식 로고·서비스를 숨기지 않는다. 검색 결과는 선택한 도로명/지번과 우편번호만 명시 적용하고 상세주소는 유지한다. 외부 조회에 기존 연락처나 주소를 자동 전달하지 않는다.

- inventory_api: schema8/국가목록/검증/tests.
- inventory_ui: SupplierAddress·공급처폼·catalog계약/tests.
- 조정: 검색 컴포넌트·응답검증·문서·브라우저·실제이관보존.
- inventory_review: 독립 소스·API/웹/lint/type/build.

## 수용

KR 검색/직접, 해외 직접 및 region/city, 국가전환·검색취소·조회실패·미지정의 주소보존, 이전응답호환, 신규/수정 저장, 서버국가/길이/null검증, API권한/원장불변/이관. 모의 서비스 성공·실패 및 가능하면 실제 검색 로딩을 별도로 확인한다. 모바일/다크/확대글꼴/간격·키보드·포커스 검증. 외부 iframe 자체의 전체 접근성은 보장하지 않으며 직접입력 대안 유지.

백업 .local/catalog-before-v8-20261026-132548.sqlite3 schema7 integrityok. schema8 additive. 복구는 서버중지+백업/호환코드복원이며 이후새기록은 먼저보존한다.
