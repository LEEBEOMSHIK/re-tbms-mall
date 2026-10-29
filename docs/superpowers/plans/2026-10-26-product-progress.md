# WB63 / R75 상품별 시안·샘플 상태

- 목적: 내부 상품 목록/상세와 공장 배정상품 목록/상세에서 담당 공장 및 시안·샘플 작업 상태 확인.
- 요구: 작업 대기(not_started), 디자인 시안 확인 중(design_review), 샘플 작업 중(sample_in_progress), 시안 완료(design_complete). 기존 추가 제작 요청 status와 별개이며 승인/게시/재고입고 아님.
- 담당/파일: supplier_api factory.py/inventory.py/테스트, supplier_ui factory-workspace 및공장BFF, 조정 lib/factory·components/product-progress·내부 상품 목록/상세·BFF/문서, supplier_review 독립.
- 계약: GET/PUT /api/v1/{admin|factory}/products/{id}/progress. {status,version:product.version,note?}. 서버검증 후 product.version증가, 상태/변경메모/행위자/시간/공장 이력. 같은상태·빈메모는 버전 증가 없는 no-op. 내부 관리자 또는 배정 공장만 변경. 작업 현황 기록으로 보완을 위한 이전 상태 변경도 허용하며 업무 승인 절차는 임의 도입하지 않음.
- 공장 배정 바뀌면 작업 대기로 초기화. 기존 이력은 내부 관리자가 확인하되 공장은 현재 배정 세대 이력만 확인. 같은 공장으로 재배정해도 이전 배정의 이력을 자동 재공개하지 않음. 공유 설정만 바꾸는 경우 현재 상태 유지.
- UI: 회색 대기/파랑 확인중/노랑 샘플/초록 완료와 상태 문구. 상세의 상태 변경은 기존 항목의 작업 동작이며 신규 등록 화면이 아니다. 변경 성공 SaveResult, 실패시 입력보존·재조회 전 중복 저장차단. 이력 공통페이지네이션. 관리자 이력에 공장명 표시.
- 검증: 권한/타공장/없는배정/잘못된상태/버전충돌/no-op/보완작업/배정세대/재고·요청 불변, 웹타입/린트/브라우저·모바일·독립검토. 합성 계정·임시DB 사용.
- 복구: schema10 실DB 사전백업 .local/catalog-before-design-status-20261026-174646.sqlite3 확보. schema11 추가 변경만 적용. 복원 시 이후 업무데이터 존재 확인 후 중단/복구, 무조건 DB삭제 금지.
