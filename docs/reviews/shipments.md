# WB86 / R94 샘플·완제품 발송 검증

## 범위
공장 발송(샘플/완제품), 내부 수령/검수, 완제품 합격 수량의 입고 확정. 샘플은 SKU/원장에 반영하지 않는다. 목적·상태·수량을 분리해 보여준다. 자동 택배 연동, 고객 배송, 샘플 판매 전환, 반품/추가 수령 정정 절차는 범위 밖이다.

## 담당
shipment_api: 서버·DB·원장, shipment_ui: 두 역할 UI/BFF, shipment_review: 독립 소스/테스트/브라우저, root: 통합·문서. 서버 계약 docs/contracts/shipments.md, 계획 docs/superpowers/plans/2026-10-28-shipments.md.

## 검증 현황
- backend 신규17 테스트 및 기존 관련회귀 포함207/207 통과(exit0,72.54초). test_shipments, test_inventory, test_movement_reasons, test_suppliers, test_sku_settings, test_factory, test_factory_progress, test_product_images, test_supplier_details, test_supplier_countries, test_product_naming, test_option_values. 임시DB .local/pytest-shipments-regression-final.
- 최초 신규테스트는 history INSERT placeholders 오류로 실패했고 수정 후 통과. 구버전 migration fixtures가 새 shipment 테이블을 남긴 채 PRAGMA만 내려 충돌한 문제는 fixture에서 신규테이블을 제거해 옛 DB 형상을 재현하도록 수정했다. 제품의 버전 검증을 약화하지 않았다.
- 독립 API17/17 exit0(2.86초). 샘플재고불변/합격입고/다른공장권한/초과발송/수량·날짜·버전/여러SKU 중 실패시 전체rollback/동시확정멱등성/v12backup 확인.
- 독립 브라우저 fullflow exit0:31건목록 검색/필터/페이지개수와첫페이지복귀, 샘플422입력보존·동일UUID재시도·성공후조회503구분, 완제품10발송→8수령→6합격2불량→확정503후조회재시도→확정6, 샘플승인에서확정버튼없음. 쓰기는 모킹. 실제 BFF100품목 및 최대길이한글100품목은 존재하지않는상품404로 전송한도/서버도달 검증,잘못된Origin403 및 원본발송건수불변 확인.
- 캡처 검수에서 검색input테마와확대페이지개수줄바꿈 발견 후 명시적 입력토큰/최소선택너비로 수정했다. 테마전환 애니메이션 완료 후 inputBG==bodyBG를 실측하고 목록4보기/모바일확정상세를 다시 촬영·직접검수했다. 최종fullflow exit0, 독립검증 통과.

## 데이터 보존·복구
기존 v12 DB는 v13 추가 테이블로 확장한다. 마이그레이션 전 SQLite backup을 생성하고 기존 상품/SKU/원장을 보존한다. v12 전용 구버전 코드는 v13을 거부하므로 단순 소스 롤백으로 복구 가능하다고 표현하지 않는다. 호환 코드를 유지한 수정 또는 백업+이후 변경 대조 복구가 필요하다. 확정 입고는 소스 롤백으로 취소하지 않으며 원장 정정 절차가 필요하다. WB83 별도 작업도 schema 변경 가능성이 있어 추후 통합 시 마이그레이션 번호/계약을 조율해야 한다.

## 실제 검증 경계
실제 원본 재고/공장 업무 자료에는 테스트 쓰기를 하지 않는다. 임시 DB API 테스트와 브라우저 모킹을 구분해 기록한다. 로컬 앱에서 신규 테이블 자동 추가는 실행될 수 있으며 이는 기존 수량을 변경하지 않는 스키마 작업이다. 커밋·푸시·운영 배포 없음.

## 수정 파일·통합 확인
서버: app/shipments.py 신규, app/inventory.py(schema13 및 내부 공급처 snapshot 전달), app/factory.py(bodylimit 경계), app/main.py(route등록), tests/test_shipments.py 신규 및 기존 migration fixture/version 기대값 정비. 프론트: lib/shipments.ts, components/shipments/shipment-page.tsx/shipments.css, factory/admin shipments API 및 보호 routes, factory-proxy의 발송 전용POST/65536한도, 양역할 메뉴/시안·제작상세진입/재고관리진입/대시보드요약, admin-navigation 분류 및 테스트.

root 최종 typecheck exit0, admin-navigation/factory-dashboard/factory-session/workboard 13/13 통과. UI 담당 대상lint exit0. 기존 기본 BFF 요청 한도는 유지하고 발송/수령검수만100품목에 필요한65536한도를 제공한다. 공장수정화면에서 내부 검수 버튼을 제공하지 않으며 내부 입고경로는 재고관리 메뉴로 분류한다.

실제 .local/catalog.sqlite3 스키마13과 최신 pre-v13 백업을 읽기 전용 비교: products/skus/movements 동일=True, 발송0건. 백업 파일은 .local/catalog.sqlite3.pre-v13-*.bak이며 원본자료를 문서에 복제하지 않는다. 동시에 들어온 초기 읽기로 복수 백업이 생성될 수 있으며 덮어쓰지 않는다.

root는 데스크톱 목록과 모바일 입고 확정 상세 스크린샷을 직접 확인했다. 근거 .local/wb86-review.cjs/json, wb86-list-1440-dark.png, wb86-list-390-dark.png, wb86-confirmed-390-dark.png. 화면 모킹 확인은 실제 원본재고 입고 실행으로 표현하지 않는다.

최종 판정: 구현/독립/통합 검증 완료. 실제 업무 쓰기0(유효 저장은 브라우저모킹 및 임시DB). 내부 BFF inspect100line 존재하지않는ID404 확인도 포함한다. 한 건의 수령 결과는 최종확정1회이며 분할배송 건은 별도발송 등록, 누락후추가도착 재처리/샘플판매전환은 범위밖으로 화면·계획에 명시했다.
