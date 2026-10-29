# WB61 / R70 상품 이미지 관리 검증

- 범위/계약/담당: docs/superpowers/plans/2026-10-26-product-images.md
- API: supplier_api가 임시 DB·합성 이미지로 전체 pytest 278개 통과(신규 이미지 22개 포함). 관리자 인증, 잘못된 형식/손상/용량/크기, 종류 제한, 메타데이터 제거, UUID 재시도, 다른 상품 관계, 삭제 및 마이그레이션 보존 확인. Pillow 13.0.0 설치·requirements 고정.
- UI: supplier_ui 자체 lint·typecheck 종료 코드0. Root parser 테스트2개 통과(외부/실행형 URL, 빈 설명, 잘못된 종류, 중복/초과 응답).
- 브라우저: .local/product-images-browser.cjs Edge 통과. 3영역 분리/별도등록/미리보기/저장 실패 입력 보존/동일 UUID 재시도/상세 자동 복귀/조회 기반 저장안내/삭제 실패 후 성공/SVG 차단/가짜 saved_image 성공표시 방지/1440·390폭 및 라이트·다크 렌더링. 이미지 쓰기는 전부 테스트 응답으로 대체. .local/product-images.png 시각 확인(합성 1px 이미지).
- 실제 연동: .local/product-images-read-integration.cjs 인증된 Next BFF→FastAPI GET200, 익명401 확인. 실제 업무 DB에 테스트 이미지 등록·삭제하지 않음. 실제 전체 업로드 연동은 미실행이며 API 쓰기와 브라우저 UX를 분리 검증함.
- 기존 데이터: schema8 백업 .local/catalog-before-images-20261026-170422.sqlite3 후 schema9 추가 테이블 경로 확인. 복구 시 서버 중단 후 백업을 별도 복원하고 이후 작성된 데이터가 없는지 먼저 확인. 테이블/업무 데이터를 임의 삭제하지 않음.
- 독립 검증: supplier_review 직접 웹76개·lint·typecheck·build 종료 코드0, API 이미지22개 통과. API 샌드박스 실행 무응답 중단 후 승인 실행에서 통과(1.81초). 코드 검토 차단 사항 없음. API 전체278개는 supplier_api 실행 근거와 구분한다. 루트 작업 보드 파서5개 통과.
- 운영 객체 저장소·CDN·자동 공개·이미지 순서/대표 정책은 미정. 고객 이미지와 시안은 현재 모두 관리자 전용 조회. Docker/배포 검증 미실행.
