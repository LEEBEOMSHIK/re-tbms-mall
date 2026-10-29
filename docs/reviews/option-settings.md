# WB76 / R86 옵션 사용 상태 검증

- 구현: root 파서/목록/문서, supplier_api 서버/마이그레이션, supplier_ui 별도 옵션수정/BFF/호환URL.
- 파서 테스트: apps/web/tests/sku-settings.test.ts 실패(undefined) 확인 후 구현하여 통과. 명시적false 보존, 기존응답 누락true 호환, 잘못된타입 거부, 재고 보존.
- root 브라우저 .local/option-status.cjs 통과: 비활성 옵션 상세·재고목록 포함 및 수량 유지, 옵션수정 링크, 구threshold URL 새화면redirect, 입력에 표 없음, 모바일390 다크 가로넘침 없음(표 자체스크롤), 익명URL 로그인/BFF401/교차Origin403. .local/option-status-dark-mobile.png 시각확인.
- supplier_ui 브라우저 .local/wb76-option-settings-browser.cjs 통과: 상태+기준 409 보존/최신조회, 비활성 및 재활성 모의저장/수량불변, 완료 전후값/초점, 완료후조회실패 구분, 상품상세복귀, 모바일390 다크/글자24px.
- 브라우저 모든 쓰기는 모의 API이며 실제 DB 재고변경 없음. 실제 API 동작은 격리 DB pytest로 검증한다.
- 별도입력URL은 관리자 인증 필수. 상품상세는 상태표시만 하며 입력폼/전체원장 없음. 저장성공과 조회실패 별도표시, 두 입력 실패시유지.
- supplier_api 전체 API 테스트 351건 통과(91.41초, 격리 .pytest_cache/wb76-api-final). 새 settings15건 포함: strict입력/권한/공장계정거부/동시CAS/비활성입출고·재활성/기존threshold상태보존/배치재등록비활성보존/schema11→12데이터보존/컬럼충돌롤백. 최초기존마이그레이션 기대값2건은 신규컬럼을 포함한 전체행 비교로 실패해 기존컬럼보존+is_active=1 검사로 갱신 후 전체 통과.
- supplier_ui 최종 타입/담당파일 lint 통과. .local/wb76-option-settings-saved.png root시각확인(다크·24px).
- 로컬8100 OpenAPI에 /api/v1/admin/skus/{sku_id}/settings 존재 읽기확인. 실제 재고 API 쓰기는 수행하지 않음.
- supplier_review 독립검증: frontend80/80, 전체 lint/typecheck exit0, 새 API15/15(3.98초, 별도 임시DB) 통과. 관리자/Origin, strict body, BEGIN IMMEDIATE+공유버전 CAS, 데이터보존/migration rollback, UI 실패보존/조회gate/확정응답검증/완료조회실패분리/인증redirect 검토 후 차단없음. 최초 legacy SKU 기대값의 is_active누락1건은 호환계약에 맞춰 수정후전체80 통과. 최초 샌드박스 API지연은 중단하고 허용된 실행환경의 격리DB에서 재실행.
- 통합 판정: 완료(root). 운영 배포/실제 데이터 저장/고객 판매선택 연동은 수행하지 않았다.
- 범위: 고객 판매연동 미구현으로 판매선택 차단은 검증하지 않음. 사용안함 옵션도 실제 재고 처리 가능. 색상/사이즈 식별자 변경 없음.
- 복구: UI/API 변경 복원, 비파괴 추가컬럼 유지(기존코드가 무시 가능). 재고/이력/사용상태를 임의초기화하지 않는다.
