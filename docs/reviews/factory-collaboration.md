# WB62 공장 협업 검증

- 계획/수용 기준: docs/superpowers/plans/2026-10-26-factory-collaboration.md
- 사용자 확정: 상품당 담당 공장 한 곳, 내부 관리자 계정 발급, 배정 상품 및 추가 제작 요청.
- API 담당 실행: 전체301개 통과(factory23개 포함). 비밀번호 해시/로그인 제한/활성계정·공급처/세션폐기/타공장 접근/시안공유/생산수량·상태·재시도·재고불변/추가 마이그레이션 보존.
- 독립 검증: supplier_review 최종 웹79개·lint·typecheck·build·diffcheck 통과. API factory23개는 분리된 basetemp에서 직접 통과. 최초 병렬 pytest 공통 tmp 폴더 잠금으로 5setup오류가 발생해 고유 경로로 재실행했다.
- 리뷰 수정: 표시명 서버80자 일치, 저장응답 대상/버전/입력일치 검증, 성공 receipt와 목록조회실패 구분, 메모 공백 보존, 이미 진행된 재시도 응답 허용, 취소 확정 로컬 상태 유지, 시안 공유 product.version 비교로 해제된 자료 재공개 방지.
- 정적검사 초기실패: root npm 작업 디렉터리 오류는 --prefix로 수정, Next 신규 layout 타입 캐시 불일치는 next typegen으로 갱신, effect/lint 경고는 실제 비동기 콜백과 별도 최소 receipt 저장소로 수정 후 통과.
- 백업: .local/catalog-before-factory-20261026-172503.sqlite3은 생성 시 schema10이었다. 개발 서버 자동 재로딩/조회 이후 만든 현상태 백업이며 schema9 사전백업으로 주장하지 않는다. 이전 WB61 schema8 백업도 보존한다. 테스트는 schema9→10 기존데이터 보존 및 실패 롤백을 임시DB에서 검증했다.
- 관리자 브라우저: .local/factory-admin-browser.cjs Edge 통과. 한 공장/상품버전/명시 design공유, 별도 계정 발급과 성공 뒤 GET실패 receipt, 요청 수량·공백 메모·503재시도 UUID 유지, 취소 후 버튼제거, 관리자4화면1440/390 및 다크 넘침 없음. 시안 선택 테스트에서 숨겨진 native checkbox 대신 실제 라벨 클릭으로 변경 후 통과. .local/factory-admin-assignment.png 모바일 다크 시각 확인. 실제 업무 DB에 계정·배정·제작 요청 테스트 쓰기 없음.
- 공장 격리 실통합: supplier_ui .local/wb62-factory-real-browser.cjs 전체 통과. 별도3126/8126서버·임시DB·합성계정으로 실제 BFF 로그인, 잘못된 입력 보존, Origin403, HttpOnly 별도 쿠키,23요청 페이지네이션, 관리자BFF401/로그인리다이렉트, 타공장 이미지/상태404, 공유design만조회, 순차상태완료/건너뛰기409/재고·원장불변/내부취소경합409/로그아웃/비활성계정세션401 확인.390폭·다크·24px글자 화면 확인. 임시프로세스만 식별 종료하고3126/8126해제 확인. 기존 서버와 실제업무데이터 변경 없음. 캡처: .local/wb62-factory-home.png, wb62-factory-product-mobile.png, wb62-factory-request-complete.png.
- 최종 탐색 보강: 상품 목록의 고객 표시명도 상세 링크로 연결해 SKU 등록 전에도 담당 공장 설정에 진입하도록 했다. 동일한 기존 링크 컴포넌트 스타일·ID경로 사용. .local/factory-entry-browser.cjs 실제 상품목록→상세→담당공장 설정 진입 통과. 이 1행 변경 후 독립 lint/type 재통과. 빌드는 이 링크 추가 직전 성공이며 반복하지 않음.
- 한계: 공용 내부 관리자 인증은 개인별 내부 행위자를 구분하지 않는다. 초기 비밀번호 직접 전달, 강제변경/메일발송 없음. 분산 세션·trusted-proxy rate-limit·부분생산/검수/접수후취소·요청별입고 연결·운영 배포는 미구현/미정.
