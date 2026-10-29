# 상품·SKU·재고 로컬 저장 기반 계획

날짜: 2026-10-26 / WB06 / R03·R04 일부·R07·R18
목표: 관리자 초안 상품과 색상/사이즈 SKU를 저장하고 사유가 있는 수동 재고 증감을 원장으로 남긴다.

## 구현 선택

Python 기본 sqlite3와 .local/catalog.sqlite3를 사용한다. 별도 로컬 DB/Docker 설치가 없고 현재 단일 프로세스 개발에 적합하다. 운영 DB·ORM 확정은 아니며 이후 전환 시 마이그레이션을 설계한다. PRAGMA user_version=1을 확인하고 지원하지 않는 DB는 자동 초기화하지 않는다. 기존 고객 샘플/진열 파일과 분리하여 사용자 자료를 보존한다.

상품은 고객 게시 전 초안이다. 상품 등록/정보 수정, SKU 추가, 초기0재고, 수동 입출고·조정 기록만 제공한다. 상품/SKU 삭제, 게시, 사진 업로드, SKU 옵션 수정, 주문 예약/할당, 격리/반품/배송 자동 연결은 후속이다. 물리 창고 운영 정책을 확정하지 않고 단일 로컬 잔고만 다룬다. 금액/실거래를 추가하지 않는다.

## API 계약

모든 경로 /api/v1/admin 하위 인증 필수. GETcatalog => {mode:local,products,skus,movements}. POSTproducts 및 PUTproducts/{id}, POSTskus, POSTinventory/movements 제공. ID는 UUID문자열. 상품/SKU version은0부터 시작한다. 수정과 재고 변경은 현재 version이 필요하다.
상품: id,name,category,description,version.
SKU: id,product_id,code,color,size,reorder_point,on_hand,version.
원장: id,sku_id,delta,reason,actor,created_at,balance_after,request_id.
원장 요청: sku_id,version,delta,reason,request_id(UUID). 동일 request_id+내용 재전송은 기존 결과, 다른 내용은409. BEGIN IMMEDIATE로 잔고와 원장을 하나의 트랜잭션으로 기록한다. 수량 음수/초과·0변경·빈 사유·중복 코드/옵션을 서버에서 거절한다. actor는 서버 지정 local-admin(개인별 계정 감사는 아직 미구현).

## 분담 및 검증

inventory_api: SQLite모듈/스키마/인증 API/제약·동시성·재전송·재시작 테스트.
inventory_ui: 보호된 /admin/catalog 화면·같은 출처 BFF·등록/수정/원장/오류 보존.
조정: 지침/ADR/메뉴/보드·브라우저 통합 검증.
독립 검증: 소스·API/웹검증·빌드, 무인증/출처/재고 불변식 확인.

- [x] 빈 DB에서 상품/SKU 등록과 재조회
- [x] 수정충돌·중복옵션·잘못된수량·음수재고 거부
- [x] 원장과 잔고 일치, 동일요청 재시도 중복차감 방지, 동시성
- [x] 재시작 보존·지원하지 않는스키마 오류
- [x] 브라우저 등록→SKU→입출고→이력, 오류 입력 보존, 모바일
- [x] 독립 검증 후 보드 갱신
