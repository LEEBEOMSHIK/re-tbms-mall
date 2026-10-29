# 세부 카테고리·계절 관리와 내부 관리명

2026-10-26 / WB16 / R03·R18·R32·R33

## 합의와 범위

사용자는 대분류/세부 카테고리, 계절별 내부 관리명과 조합별 순번 방식을 승인했다. 신규 관리명은 ROOT-LEAF-SEASON-000001 형식이다. 기존 내부명은 유지한다. 계절/분류가 바뀌어도 이미 발급한 이름은 바꾸지 않는다. 고객 표시명에는 자동으로 계절을 붙이지 않는다. 계절 속성과 시즌 기획전은 별개다.

상품 대분류 선택 후 해당 세부 분류 선택, 계절 선택을 제공한다. 봄 SP·여름 SU·가을 FA·겨울 WI의 복수 선택 또는 사계절 ALL을 사용한다. 서버는 SP/SU/FA/WI 순서로 정규화해 봄·가을은 SPFA가 된다. 네 계절을 모두 선택하면 ALL로 통일한다. ALL과 개별 계절 혼합/중복/알 수 없는 값은 거부한다. 기존 상품 계절 []는 미지정으로 보존한다.

카테고리 관리 /admin/catalog/categories에서 대분류/세부분류 추가, 이름·순서·사용 여부 수정. 코드는 발급 식별자이므로 생성 후 수정 불가, 부모 이동/삭제 없음. 이번 선택은 두 단계만 허용한다. 사용 중지 분류의 기존 상품은 유지하며 신규 배정은 차단한다.

## 계약

Category={id,name,code,parent_id:null|string,is_active:boolean,sort_order:int,version:int}. 코드 전역 유일, 신규는 영문 대문자/숫자 2~12자. 부모는 대분류만 허용한다. 같은 부모 안 이름 중복은 거절한다. 이름80자, 순서0~10000, 엄격한 bool/int 검증.

GET catalog는 categories, season_options:[{code,label}], products에 seasons:string[]를 포함한다. Product.category_id는 신규에는 세부분류, 기존 root ID는 미지정 상태로 유지한다. Product.category는 해당 ID의 현재 표시명이다. 분류명 수정은 내부명/상품 버전/원장 변경 없이 표시명만 반영한다.

POST /api/v1/admin/categories {name,code,parent_id,sort_order,is_active} →201. PUT /categories/{id} {name,sort_order,is_active,version} →200. 미인증401, 대상없음404, 중복/충돌409, 형식·부모·분류·계절 오류422. Next /api/admin/categories[/id]는 세션+Origin 검사를 유지한다.

상품 요청은 기존 name,category_id,description,(version)에 seasons를 추가한다. 신규는 사용 중인 세부분류와 사용 중인 부모, 유효 계절이 필요하다. 기존 상품의 분류/계절을 그대로 유지하면 미지정/사용 중지 상태의 고객명 등만 수정할 수 있다. 분류 또는 계절을 바꾸면 둘 다 신규 유효조건을 만족해야 한다.

번호는 서버에서 (세부분류ID,정규화계절코드)별 영속 카운터와 상품 생성을 하나의 트랜잭션으로 저장한다. 정확한 번호를 클라이언트에서 예측하지 않는다. 코드/부모는 불변이며 순번은 상품 삭제를 근거로 재사용하지 않는다.

## 이관과 분담

SQLite v2→v3는 category parent/active/order/version, product seasons와 조합별 카운터를 추가한다. 기존 카테고리는 root, 기존 상품은 원 ID·이름·분류·내부명·버전·옵션·재고·원장 그대로 두고 seasons=[]로 이관한다. 기본 세부분류는 시작용으로 추가하고 코드 충돌 시 기존 값을 덮어쓰지 않는다. v1 설치도 v2→v3 순차 이관한다. 트랜잭션 실패 시 전체 이관 롤백.

사전 백업: .local/catalog-before-v3-20261026-011717.sqlite3 (schema2). 조정 담당은 문서·보드·브라우저·백업 대조를 맡는다. inventory_api는 services/api의 스키마/API/테스트, inventory_ui는 web catalog/lib/tests와 category BFF, inventory_review는 독립 코드 검토 및 검증을 소유한다. 공유 계약은 먼저 맞추고 파일 소유권을 겹치지 않는다.

## 수용 기준·검증

- 분류 2단계와 계절 선택, 서버 발급 형식/표시, 두 이름 유지.
- 계절 순서·4계절 정규화, ALL혼합/중복/빈값/미등록 분류 거부.
- 조합별 증가·동시성·재시작·발급명 불변.
- 분류 추가·이름/순서/사용 여부·버전 충돌·인증·Origin·사용 중지 부모 제약.
- 기존 미지정/사용 중지 상품의 이름 수정과 새 분류 배정 조건.
- 이관 보존·실패 롤백, 기존 재고 실패/경계 회귀.
- 독립 API/웹 테스트·lint·타입·빌드, Edge PC/모바일. 실제 번호 소모를 피하는 분리된 브라우저 데이터 사용 시 명시한다.

복구: API 중지 후 현재 v3도 백업하고 호환 코드와 v2 백업을 함께 복구한다. 이관 이후 입력은 별도 보존/재적용한다. DB 삭제나 무조건 덮어쓰기 금지. 결제·게시·배송·운영 DB·커밋/푸시는 범위 밖이다.
