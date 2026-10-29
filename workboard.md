# RE: TBMS 작업 보드

- 갱신일: 2026-10-29
- 검증일: 2026-10-29
- 검증 요약: WB92 판매가격·할인관리 서버459/웹98·독립/실제관리저장/고객표시 통과(docs/reviews/sale-price.md). WB91 가격·리뷰 관리 및 구매인증 차단 경계 API435/웹95/독립검증 통과(docs/reviews/price-reviews.md). WB90 실제 샘플 홈/목록/상세·옵션·PC/모바일 독립 검증 통과(docs/reviews/sample-storefront.md). WB89 고객 필터토글·디자인분리 웹13/독립8·타입/lint·8보기/관리자격리 통과(docs/reviews/customer-design.md). WB87 공개상품 API256/최종67·독립56·웹92/type/lint·20보기 통과(docs/reviews/public-catalog.md). WB13 실제 재고 API61/독립22·웹20·독립4보기 통과(docs/reviews/dashboard-inventory.md). WB86 샘플/완제품 발송·수령·검수·합격입고 API207/독립17·웹업무흐름 통과(docs/reviews/shipments.md). WB85 본인 프로필 수정 API54/독립18·브라우저4보기 통과(docs/reviews/factory-profile.md). WB84 왼쪽 메뉴·프로필 독립4보기 및 공장 대시보드·독립12보기 통과(docs/reviews/factory-dashboard.md). WB82 공장 테스트 로그인·권한·저장·3100통합 검증 통과(docs/reviews/factory-test-login.md). WB81 관리자 목록 간소화·독립 웹80/112보기 검증 통과(docs/reviews/admin-lists.md). WB79 카테고리 > 표기·상품6열 정리 검증 통과. WB80 원본 HEAD/index 보존·417개 blob 일치·웹80/보드5·독립 검증 통과. docs/reviews/catalog-list.md / docs/reviews/worktree-isolation.md

이 파일이 작업 현황의 유일한 원본입니다. 수정 후 /admin/workboard를 새로고침하면 반영됩니다. 편집 형식과 작업 절차는 docs/workboard.md를 참고합니다. 사업 정책의 제안·미정은 승인으로 바꾸지 않습니다.

다음 제안: WB93 관리자 기능 통합·검증 완료. 현재 채팅의 기본 worktree 보관 제한 해소 후 복구 가능한 정리 필요. WB13 실제 재고 연결 완료. WB87 상품 게시·실제 고객 화면 연결 완료. 다음 고객 보강은 WB88 소재·실측표·세탁 안내와 실제 운영 정보 확인입니다(미착수 제안).

## 작업 목록

### WB94 | 관리자 세션 만료 자동 이동
- 상태: done
- 담당: root 구현 / 독립 검증 별도
- 우선순위: P1
- 내용: 열린 관리자에서 인증 만료 시 로그인 이동
- 완료 기준: 401·만료시간·탭 복귀 감지, 403/503/네트워크 실패 구분, 기존 인증 보존
- 선행 조건: 기존 관리자 세션
- 검증: 웹160/타입/lint·독립10 및 실제 2탭 세션 종료→기존 탭 자동 로그인 이동 확인. docs/reviews/admin-session-expiry.md


### WB93 | 의류 디자인 샘플 관리자 통합

- 상태: in-progress
- 담당: root 웹·통합 / studio_backend 서버 / 독립검증 별도
- 우선순위: P1
- 내용: 검토한 3D 원단·핏·후드 둘레 나염을 관리자 인증 및 서버 버전 저장에 연결
- 완료 기준: 기존 관리자 보존, v1 문서 호환, v2 저장·자산권한·충돌·실기검증, 통합 후 안전한 정리
- 선행 조건: WB83 및 독립 샘플 검토 수용
- 검증: 기능 통합·독립 검증 통과(API505/최종47, 웹159, 렌더러7, lint/build, 실제 생성·저장·복원). archive_worktree가 현재 채팅 기본 checkout 제거를 거부하여 폴더 정리 보류. 백업 .local/integration-WB93/preserved-worktree, 통합 커밋 없음. docs/reviews/studio-integration.md / docs/superpowers/plans/2026-10-29-studio-integration.md


### WB92 | 판매 가격 명시와 할인 관리·고객 표시

- 상태: done
- 담당: root 통합·문서 / public_catalog_api 서버 / public_catalog_web 웹 / public_catalog_review 독립검증
- 우선순위: P1
- 내용: 기본가·할인가 관리, 판매 가격 라벨·취소선·할인율·최종가 통일과 샘플 실제확인
- 완료 기준: 서버 금액경계/이력·관리저장·고객홈/목록/상세·모바일다크확대·독립검증
- 선행 조건: WB91 가격관리. 쿠폰/예약/옵션/주문가격은 범위 밖
- 검증: 서버459/대상64·웹98/type/lint·root16·독립27/브라우저 통과. 실제 관리자샘플29,000→23,200(20%)저장 및 홈/목록/상세·모바일확인. docs/reviews/sale-price.md / docs/contracts/sale-price.md


### WB91 | 가격·구매 고객 리뷰·평점 관리

- 상태: done
- 담당: root 문서·통합 / public_catalog_api 서버 / public_catalog_web 웹 / public_catalog_review 독립검증
- 우선순위: P1
- 내용: 가격관리 접근·이력, 리뷰 공개 집계/0건, 관리 숨김·답변. 구매고객만 작성하며 회원/주문 연동 전에는 쓰기 차단
- 완료 기준: 권한/집계/버전/저장흐름·PC/모바일·독립검증. 실제 구매 연동은 후속
- 선행 조건: WB87/WB89. 결제/주문 정책은 미정 유지
- 검증: API435/최종23·통합74, 웹95/type/lint, 독립29·브라우저 실제0건/합성저장/모바일다크24 통과. 후속 샘플가격29,000원 입력·목록/상세 실제표시 확인. docs/reviews/price-reviews.md / docs/superpowers/plans/2026-10-29-price-reviews.md


### WB90 | 실제 샘플 상품 전시 확인

- 상태: done
- 담당: root 설정·통합 / public_catalog_review 독립검증
- 우선순위: P1
- 내용: 별도 샘플 의류 상품·고객 이미지·옵션을 로컬 API로 등록하고 홈/목록/상세에 게시. 가격 미정 유지.
- 완료 기준: 실제 데이터로 홈→목록→상세·옵션·이미지·PC/모바일 확인, 기존 상품/재고 보존
- 선행 조건: WB87/WB89. API·DB 계약 변경 없음
- 검증: 실제 홈/목록/상세 PC1440·모바일390, WEBP 로드·재고/품절·다크24px·넘침 없음·독립 검증 통과. 기존 상품/SKU 동일성 확인. docs/reviews/sample-storefront.md


### WB89 | 고객 탐색 간소화와 디자인 기준 분리

- 상태: done
- 담당: root 문서·통합 / public_catalog_web 고객UI / public_catalog_review 독립검증
- 우선순위: P1
- 내용: 검색 상시표시·상세 필터 기본닫힘 토글·선택칩, 고객 상품 중심 시각 개선 및 고객/관리자 디자인 문서 분리.
- 완료 기준: 필터/URL/페이지 유지·키보드/포커스·모바일/다크/확대·관리자 격리·독립검증
- 선행 조건: WB87 실제 고객 카탈로그. API/DB 변경 없음
- 검증: 웹13/독립8·type/lint·8보기/기본접힘/칩/URL/페이지/동일SKU/키보드포커스 통과. 관리자실측/공통CSS해시 동일·업무쓰기0. docs/superpowers/plans/2026-10-28-customer-design.md / docs/reviews/customer-design.md


### WB88 | 고객 상품 상세 정보 보강

- 상태: next
- 담당: 미배정
- 우선순위: P2
- 내용: 소재·실측표·세탁 안내 등 의류 상세 정보 입력/표시 보강 제안. 실제 회사 정보·배송/교환 정책은 사용자 운영 내용 확인 후 반영.
- 완료 기준: 상세 정보 계약·관리자 입력·고객 표시·모바일·독립 검증. 범위 확정 전 미착수
- 선행 조건: WB87 / 제공할 상품 상세 정보와 운영 정책 확인
- 검증: 후속 제안이며 미실행. 법규 충족이나 판매 개시 승인을 의미하지 않음


### WB87 | 상품 게시와 실제 고객 쇼핑 화면

- 상태: done
- 담당: root 조정·문서 / public_catalog_api 서버 / public_catalog_web 화면 / public_catalog_review 독립 검증
- 우선순위: P1
- 내용: 명시적 상품 게시·중지, 실제 고객 홈/목록/상세/이미지/옵션/품절과 실제 상품 진열 연결.
- 완료 기준: 공개 정보 경계·게시 조건/충돌·기존 데이터 보존·검색필터 조합·모바일/다크·저장UX·독립 검증
- 선행 조건: WB13 실제재고 / 상품·옵션·고객이미지 / 기존 진열설정. 주문/결제는 미정 유지
- 검증: API256/후속67·독립56·웹92·type/lint·고객/관리자20보기·필터/저장/권한/이미지 검증 통과. schema14백업·기존4테이블/진열설정불변·실제게시0건. docs/superpowers/plans/2026-10-28-public-catalog.md / docs/reviews/public-catalog.md


### WB86 | 샘플·완제품 발송 및 수령·검수·입고

- 상태: done
- 담당: root 조정·문서 / shipment_api 서버·원장 / shipment_ui 공장·내부 화면 / 독립 검증자
- 우선순위: P1
- 내용: 샘플·완제품 발송을 구분하고 내부 수령·검수 후 완제품 합격 수량만 입고 확정 시 재고 반영.
- 완료 기준: 역할 범위·단계 전이·분할 발송·수량검증·중복 입고 방지·원장 원자성·화면분리·저장UX·독립검증
- 선행 조건: WB62 제작 요청/공장권한 · WB63 시안 상태 · 기존 SKU 원장
- 검증: API207/독립API17·양역할 브라우저 전체흐름/4보기·100품목BFF·중복/롤백·type/lint·웹13 통과. 원본상품/SKU/원장보존·유효업무쓰기0 확인. docs/superpowers/plans/2026-10-28-shipments.md / docs/contracts/shipments.md / docs/reviews/shipments.md


### WB85 | 공장 관리자 본인 프로필 수정

- 상태: done
- 담당: root 조정·문서 / profile_api 서버 / profile_ui 화면 / factory_verify 독립검증
- 우선순위: P1
- 내용: 본인 이름·비밀번호 수정, 아이디·소속·권한 변경 차단.
- 완료 기준: 서버 본인 범위·불변 필드·비밀번호 검증·충돌 처리·분리된 수정 화면·저장 완료 UX·독립검증
- 선행 조건: WB82 공장 인증 / WB84 프로필 카드
- 검증: 중복 대시보드 링크 제거·편집 취소/메뉴 이동 독립검증·type/lint 통과. 후속 자동 대시보드 복귀·일회성 알림·제목 정리/실패 유지 독립검증·type/lint 통과. API54/독립API18·모킹 브라우저4보기/저장·오류·권한·주버튼·type/lint·세션/보드8 통과. 실제 계정 비밀번호 미변경. docs/superpowers/plans/2026-10-28-factory-profile.md / docs/reviews/factory-profile.md


### WB84 | 공장 홈 대시보드

- 상태: done
- 담당: root 통합·문서 / factory_ui_audit 구현 / factory_verify 독립검증
- 우선순위: P1
- 내용: ERP형 왼쪽 사이드바·로그아웃 옆 실제 계정 프로필, 담당 상품·시안 상태·제작 요청 요약과 업무별 상세 진입, 내부 관리자 디자인 통일.
- 완료 기준: 정확한 집계·상세 링크·검색/페이지 유지·모바일·독립검증
- 선행 조건: WB82 공장 역할·실제 범위 API 유지
- 검증: 프로필 카드 정보 위계·아이디 펼침/접기·독립4보기·type/lint 통과. 왼쪽 메뉴·프로필 독립4보기/모바일 포커스/503복구/401로그인복귀 통과. 10/28 헤더 SVG실측24·버튼44/실제24px·독립6보기·type 통과. 집계4·보드5·type/lint·독립3경로12보기·검색/필터/페이지/상세·빈/실패 통과. docs/reviews/factory-dashboard.md / docs/superpowers/plans/2026-10-27-factory-dashboard.md

### WB83 | 내부 의류 2D 편집·3D 미리보기 구현

- 상태: in-progress
- 담당: parallel-work root 통합 / designer_backend·designer_renderer·designer_ui 구현 / designer_review 독립검증
- 우선순위: P1
- 내용: 사진 참고 스토키네트 조직·실 꼬임/잔털·원단별 정적 주름 보완(docs/superpowers/plans/2026-10-28-garment-photo-reference.md). 전체뷰 원단 구분·운동복 폴리에스터 인터록·전용 스웨트 자료 반영(docs/superpowers/plans/2026-10-28-garment-whole-fabric.md). 후속 2D 품질/재질 식별 피드백에 따라 같은 의류 모델의 정사영 2D·나염 좌표 대응·원단 근거 표시 반영(docs/superpowers/plans/2026-10-28-garment-2d-material-consistency.md). 사용자 시각 품질 피드백 반영: 착용 상품컷(마네킹 숨김) 작가 제작 모델·면/울 스캔·원단확대·사선보기 구현. 승인 설계에 따라 티셔츠·후드 색상/재질/나염 2D 편집, 3D 동시 확인, 버전 저장·사본·PNG 구현. 별도 worktree 웹3102/API8102에서 실행 중.
- 완료 기준: 기능·권한·저장UX·독립검증 및 남은 브라우저 수용항목 확인. 원본 소스 통합은 별도이며 검증 후 worktree 정리.
- 선행 조건: WB80 격리 공간 / 사용자 상세 설계 및 구현 승인 완료
- 검증: 사진참고 보완 웹139·lint/type/build·독립11 통과. 같은색 면/울 전체뷰·울편직 확대·앞뒤 나염 확인. 실사 동일성/사용자 품질 수용은 미완료이며 정적주름은 천물성시뮬레이션이 아님. 전체뷰보완 웹128·lint/build·독립재질10/초기13·타입 통과. 면/울 전체뷰·폴리에스터 방향반사·스웨트 전용스캔·390px전환 확인. 면/스웨트 전체뷰차이는작고 실측정확도판정아님. 후속2D/원단 수정 웹120·타입/lint/build·독립23 통과. PC앞뒤 선택/이동undo·390px전환/넘침·면울확대 차이 및 후드 동일모델 확인. 새PNG 디코딩은 미검증. 2026-10-28 사용자 검토에서 기존 각진 3D·원단 구분 부족으로 품질 미수용. 보완 계획 docs/superpowers/plans/2026-10-28-garment-visual-quality.md. 보완검증: 웹112·타입/lint/build·API28·독립API27/형상카메라10 통과. PC앞뒤나염/울저장복원/390px소매프레임/가로넘침 검증 및 독립시각검토 확인. 실제원단/실사동일성은 주장하지 않음. 이전 기능 검증: API378·웹99·lint/type/build 통과, 독립 API27·웹16 및 후속 editor7 통과. 실제 티셔츠/후드·앞뒤 나염·모바일·저장/조회실패 분리·PNG 확인. 강제 WebGL복구·밝은테마/확대·두탭 사본 실기 및 정량성능은 미검증이므로 전체 완료 아님. 근거: 별도 worktree C:/Users/bumci/.codex/worktrees/parallel-work/re-tbms-mall의 docs/reviews/garment-designer.md / docs/superpowers/plans/2026-10-27-garment-designer.md.
- 정리: 구현 커밋 3a16477, 시각보완25cc4fb·자산해시보존7a1a95a·2D원단일치b02a4ec·전체원단8782afc, 기준 a1f83a5. 원본 앱 변경·소스병합·푸시 없음. 현재 검토용 worktree/서버 유지. 통합 검증 후 소유 프로세스 중지, 필요한 ignored DB/자산 보존, archive_worktree로 복구 가능하게 정리하고 통합 커밋/복구 위치/실행 결과를 이 카드에 기록한다.

### WB82 | 공장 테스트 로그인과 사전 검증

- 상태: done
- 담당: root 로그인·통합 / factory_seed 합성자료 / factory_ui_audit 공장화면 / factory_verify 독립검증
- 우선순위: P1
- 내용: 개발 전용 공장 테스트 진입과 권한/작업흐름 점검. 후속 로그인 공통 배치와 관리자 화면의 공장 테스트 직접 진입 적용.
- 완료 기준: 역할별 접근 차단·실제 로그인/상태변경·모바일·독립검증·로컬 통합
- 선행 조건: WB81 / 기존 공장 계정·권한 구현 보존
- 검증: 로그인 디자인 후속16보기·type/lint 통과. 웹81·API36·seed4·독립24보기/모의12보기·3100통합 통과. 격리서버 종료, worktree정리는 앱 기본체크아웃 보호로 보류. docs/reviews/factory-test-login.md / docs/superpowers/plans/2026-10-27-factory-test-login.md

### WB81 | 다른 관리자 목록 간소화

- 상태: done
- 담당: root 통합·재고·진열·보드 / supplier_ui 기준정보·공급처 / supplier_api 공장목록 / supplier_review 독립검증
- 우선순위: P1
- 내용: 핵심정보 직접표시와 코드·보조정보 그룹화/펼쳐보기 통일.
- 완료 기준: 목록군 점검·정보접근 유지·검색/필터/페이지·모바일·독립검증
- 선행 조건: WB79 연속 UI개선 / WB80 별도작업 보존
- 검증: 독립 웹80·lint/type·28 URL/112보기·영역별 검색/필터/페이지/키보드 검증 통과. docs/reviews/admin-lists.md / docs/superpowers/plans/2026-10-27-admin-lists.md


### WB80 | 독립 worktree 준비와 통합 후 정리 기준

- 상태: done
- 담당: 이 채팅 조정 담당 / 독립 검증자
- 우선순위: P1
- 내용: 현재 변경 보존, 별도 관리형 worktree 준비, 통합 후 불필요 worktree/임시 파일 정리 지침 반영.
- 완료 기준: 원본 HEAD/인덱스/소스 보존·스냅샷 일치·worktree 등록·독립 검증·인계.
- 선행 조건: 사용자 격리 요청 / WB79 변경 보존 / 신규 기능은 별도 지정
- 검증: 원본 HEAD/index 보존·417개 blob 일치·웹80/보드5·독립검증 통과. 기준 a1f83a5, 브랜치 codex/parallel-work-20261027, 경로 C:/Users/bumci/.codex/worktrees/parallel-work/re-tbms-mall. 기능 통합/폐기는 후속 작업. docs/reviews/worktree-isolation.md


### WB79 | 카테고리 표기·상품 목록 간소화

- 상태: done
- 담당: root 구현 / supplier_review 검증
- 우선순위: P1
- 내용: 카테고리 > 구분자와 상품목록6열·보조정보그룹화.
- 완료 기준: 경로·게시사유·동작유지·모바일·독립검증
- 선행 조건: 사용자 목록 간소화 요청
- 검증: 독립테스트8·lint/type·브라우저·보드5 통과. docs/reviews/catalog-list.md / docs/superpowers/plans/2026-10-27-catalog-list.md


### WB78 | 관리자 전체 핵심값 위계 통일

- 상태: done
- 담당: root 통합·대시보드·진열·보드 / supplier_ui 상품·재고 / supplier_api 공장협업 / supplier_review 독립검증
- 우선순위: P1
- 내용: 관리자 전체 화면별 핵심값 점검·공통 표현 및 보조정보 위계 통일.
- 완료 기준: 화면군 점검표·모바일/다크/확대·저장회귀·독립검증
- 선행 조건: WB77 / 사용자 전체점검 요청
- 검증: 독립28 URL·112보기/웹80·lint/type·영역별 브라우저/모의저장 통과. docs/reviews/admin-hierarchy.md / docs/superpowers/plans/2026-10-27-admin-hierarchy.md


### WB77 | 핵심 값 시각적 위계

- 상태: done
- 담당: root 구현 / supplier_review 검증
- 우선순위: P1
- 내용: 옵션·재고의 상태/수량/저장 전후 값을 강조하고 보조정보 구분.
- 완료 기준: 모바일/다크/확대·저장피드백·독립검증
- 선행 조건: WB76
- 검증: 독립 lint/type·브라우저·작업보드5 통과. docs/reviews/key-values.md / docs/superpowers/plans/2026-10-27-key-values.md


### WB76 | 옵션 사용 상태·기준 수정

- 상태: done
- 담당: root 통합 / supplier_api 서버 / supplier_ui 수정화면 / supplier_review 검증
- 우선순위: P1
- 내용: 옵션 사용 여부·부족 기준 수정과 재고/이력 보존.
- 완료 기준: 서버 경계·권한·충돌·마이그레이션, 저장UX·화면분리·독립검증
- 선행 조건: WB75 / 사용자 승인
- 검증: API351·독립API15/웹80·lint/type·모의 브라우저 통과. docs/reviews/option-settings.md / docs/superpowers/plans/2026-10-27-option-settings.md


### WB75 | 상품 상세 중심 관리

- 상태: done
- 담당: root 통합 / supplier_ui 입력 흐름 / supplier_review 검증
- 우선순위: P1
- 내용: 기본정보·옵션·재고 상세 통합과 저장 후 상품 상세 복귀.
- 완료 기준: 화면분리·문맥유지·저장피드백·모바일·독립검증
- 선행 조건: WB74 / 사용자 상세 중심 구성 승인
- 검증: 독립 검토·타입/lint·모바일/실패/저장·상세복귀 브라우저·작업보드5 통과. docs/reviews/product-hub.md / docs/superpowers/plans/2026-10-27-product-hub.md


### WB74 | 기존 옵션 부족 표시 기준 수정

- 상태: done
- 담당: root 통합 / supplier_api 서버 / supplier_ui 화면 / supplier_review 검증
- 우선순위: P1
- 내용: 기존 옵션 기준 수정·저장·완료 별도화면과 재고현황 연결.
- 완료 기준: 저장피드백·실패보존·화면분리·재고불변·독립검증
- 선행 조건: 사용자 기존옵션 수정 의도 확인
- 검증: API74·독립API16/lint·타입·쓰기UX/화면분리 브라우저 통과. docs/reviews/reorder-edit.md / docs/superpowers/plans/2026-10-27-reorder-edit.md


### WB73 | 이미지 종류·설명 입력 간소화

- 상태: done
- 담당: root UI / supplier_api 서버 / supplier_review 검증
- 우선순위: P1
- 내용: 시안종류선택 제거, 이름필수·설명선택으로 변경.
- 완료 기준: 서버/화면 검증·저장복귀·이미지 대체텍스트
- 선행 조건: 사용자 이미지 등록 간소화 요청
- 검증: 타입·웹2개·API28개·독립API28개/lint/검토·브라우저 통과. docs/reviews/image-optional-description.md / docs/superpowers/plans/2026-10-26-image-optional-description.md


### WB72 | 공장 협업 시안 관리 기본 진입

- 상태: done
- 담당: root 구현 / supplier_review 검증
- 우선순위: P1
- 내용: 시안관리 우선 진입, 관리 명칭 통일, 제작요청 목록 별도 경로.
- 완료 기준: 진입/서브메뉴/저장복귀 경로·독립검증
- 선행 조건: 사용자 공장협업 기본화면 변경 요청
- 검증: 타입·독립 lint/경로검토·브라우저/보드5개 통과. docs/reviews/factory-entry.md / docs/superpowers/plans/2026-10-26-factory-entry.md


### WB71 | 상품 타이틀 운영 상태

- 상태: done
- 담당: root 구현 / supplier_review 검증
- 우선순위: P1
- 내용: 상품명 오른쪽 운영 상태·미게시 표시, 시안 상태 분리 유지.
- 완료 기준: 데스크톱 우측·모바일·테마·도움말 및 독립검증
- 선행 조건: WB70, 사용자 상태 분리 지시
- 검증: 타입·독립 ESLint/검토·브라우저4조합 통과. docs/reviews/operation-title.md / docs/superpowers/plans/2026-10-26-operation-title.md


### WB70 | 상품 정보 공장·시안 통합과 이미지 드롭

- 상태: done
- 담당: root 상품정보 / supplier_ui 이미지 / supplier_review 검증
- 우선순위: P1
- 내용: 공장·시안 상태를 상품 정보 항목으로 통합하고 전체 이미지 등록에 드롭 지원.
- 완료 기준: 미배정·오류·모바일, 3종 드롭/검증/키보드·독립검토
- 선행 조건: WB69 및 사용자 피드백
- 검증: 타입·독립 lint/검토·정보통합/3종드롭/읽기경합/저장잠금 브라우저 통과. docs/reviews/product-info-drop.md / docs/superpowers/plans/2026-10-26-product-info-drop.md


### WB69 | 공장명 동작 버튼과 상태 구별

- 상태: done
- 담당: root 구현 / supplier_review 검증
- 우선순위: P1
- 내용: 파란 동작 버튼에 시안 상세 문구·화살표 추가, 상태 배지와 구별.
- 완료 기준: 테마·모바일·포커스·이동 및 독립 검토
- 선행 조건: WB68 사용자 후속 피드백
- 검증: 타입·브라우저4조합·독립검토 통과. docs/reviews/factory-action-affordance.md / docs/superpowers/plans/2026-10-26-factory-action-affordance.md


### WB68 | 공장명 링크 배경 표시

- 상태: done
- 담당: root 구현 / supplier_review 검증
- 우선순위: P2
- 내용: 기본 상태 연한 배경·테두리로 공장명 클릭 영역 표시.
- 완료 기준: 라이트·다크 배경·44px·링크·포커스 유지 확인
- 선행 조건: WB67
- 검증: 라이트·다크 브라우저 배경/크기/포커스/링크 및 독립 CSS 검토 통과. docs/reviews/factory-link-surface.md / docs/superpowers/plans/2026-10-26-factory-link-surface.md


### WB67 | 시안 상세 중심 관리

- 상태: done
- 담당: root 요약·상세·통합 / supplier_ui 이미지 / supplier_review 검증
- 우선순위: P1
- 내용: 공장명 링크로 시안 상세 진입, 내부시안 이미지를 시안 상세로 이동.
- 완료 기준: 고객용/내부 이미지 분리·저장복귀·미배정 접근·독립 검증
- 선행 조건: WB64, 사용자 시안 상세 통합 요청
- 검증: 타입·독립 lint/코드검토·모의 이미지 브라우저 통과. 계획: docs/superpowers/plans/2026-10-26-design-detail.md / 기록: docs/reviews/design-detail.md


### WB66 | 상품 목록 관리 작업 정리

- 상태: done
- 담당: root 구현·문서 / supplier_review 독립 검증
- 우선순위: P1
- 내용: 수정과 더보기 한 줄 배치, 보조 작업과 삭제 분리.
- 완료 기준: 키보드·모바일·삭제 확인·표 잘림 검증
- 선행 조건: WB65, 사용자 관리 열 혼잡 피드백
- 검증: 타입·독립 lint/코드검토·브라우저4조합 통과. 계획: docs/superpowers/plans/2026-10-26-product-row-actions.md / 기록: docs/reviews/product-row-actions.md


### WB65 | 공통 라운드 일관성

- 상태: done
- 담당: root 구현·문서 / supplier_review 독립 검증
- 우선순위: P1
- 내용: 버튼·입력창·카드 공통 반경과 용도별 토큰 적용.
- 완료 기준: 대표 화면 계산 스타일·모바일·테마 및 독립 검증
- 선행 조건: WB64, 사용자 라운드 일관성 요청
- 검증: 브라우저28조합에서12px·가로넘침 확인, 독립 CSS/lint 통과, 보드5개 통과. 계획: docs/superpowers/plans/2026-10-26-radius-consistency.md / 기록: docs/reviews/radius-consistency.md


### WB64 | 시안·샘플 관리 분리와 스타일 정렬

- 상태: done
- 담당: supplier_ui 공통 상태·공장 화면 / supplier_api 내부 관리 목록·화면 / 조정 진입·문서·브라우저 / supplier_review 독립 검증
- 우선순위: P1
- 내용: 상품 상세는 공장·상태 요약, 전용 관리 화면은 조회·이력, 별도 변경 화면은 입력만 제공하도록 분리합니다.
- 완료 기준: 상품 상세 폼/이력 제거, 전용 목록/조회/변경 분리, 저장 후 복귀·실패 보존, 공통 간격/버튼/빈 상태, 모바일·독립 검증
- 선행 조건: WB63 및 사용자 스타일·관리 위치 수정 요청
- 검증: 독립 웹79개·lint·타입·빌드 통과. 관리자 모의쓰기/공장 격리실통합으로 화면분리·저장복귀·조회실패·빈이력·검색페이지·모바일 확인. 최종1열CSS 빌드·브라우저 확인. 계획: docs/superpowers/plans/2026-10-26-progress-workspace.md / 기록: docs/reviews/progress-workspace.md

### WB63 | 담당 공장 시안·샘플 진행 상태

- 상태: done
- 담당: supplier_api 상태·이력 / supplier_ui 공장 화면 / 조정 공통 상태 UI·내부 목록·문서 / supplier_review 독립 검증
- 우선순위: P1
- 내용: 담당 공장과 작업 대기·시안 확인·샘플 작업·시안 완료를 상품별로 표시하고 이력을 남깁니다.
- 완료 기준: 담당 공장·상태 표시, 내부/공장 권한·버전충돌, 이력·공장변경 초기화, 제작요청/재고 불변, 모바일 검증
- 선행 조건: WB62 및 사용자 시안·샘플 상태 확인 요청
- 검증: API전체314개·독립진행API13개·웹79개·lint·타입·빌드 통과. 관리자 모의쓰기 및 격리실서버 공장 상태/충돌/이력/권한/재고불변/모바일 검증 완료. 계획: docs/superpowers/plans/2026-10-26-product-progress.md / 기록: docs/reviews/product-progress.md

### WB62 | 담당 공장·공장 계정·추가 제작 요청

- 상태: done
- 담당: supplier_api 권한·업무 API / supplier_ui 공장 포털 / 조정 내부 관리·계약·문서·통합 / supplier_review 독립 검증
- 우선순위: P1
- 내용: 상품당 담당 공장 한 곳, 관리자 발급 공장 계정, 명시적 시안 공유, SKU별 추가 제작 요청을 연결합니다.
- 완료 기준: 타 공장 접근 차단·계정 중지 세션 폐기·한 공장 제약·시안 비공개 기본·제작 수량/상태/재시도·재고 불변·독립 검증
- 선행 조건: 사용자 상품당 한 공장 및 관리자 계정 발급 확정, WB61
- 검증: API전체301개, 독립 공장API23개·웹79개·lint·타입·빌드 통과. 관리자 모의쓰기 브라우저 및 격리실서버 공장로그인/소유권/시안/상태/재고불변/세션폐기 검증 통과. 최종상품진입링크 브라우저·lint·타입 확인. 계획: docs/superpowers/plans/2026-10-26-factory-collaboration.md / 기록: docs/reviews/factory-collaboration.md

### WB61 | 상품 이미지 용도별 관리

- 상태: done
- 담당: supplier_api 저장·검증 / supplier_ui 이미지 화면 / 조정 BFF·문서·통합 / supplier_review 독립검증
- 우선순위: P1
- 내용: 내부 시안·고객용 모델 착용·의류 단독 이미지를 분리하고 등록·상세·삭제를 연결합니다.
- 완료 기준: 세 영역 분리·별도 등록·저장 피드백·인증·이미지 검증·기존 데이터 보존·독립검증
- 선행 조건: WB59 및 사용자 이미지 구분 요청
- 검증: API 전체278개, 독립 웹76개·이미지API22개·lint·타입·빌드 통과. Edge 등록/재시도/삭제/모바일 및 실제 인증 조회 확인. 이미지 쓰기는 임시 DB 또는 브라우저 모의로 검증. 계획: docs/superpowers/plans/2026-10-26-product-images.md / 기록: docs/reviews/product-images.md

### WB60 | 상품 상세 링크 스타일 개선

- 상태: done
- 담당: 조정 구현·브라우저 / supplier_review 독립 검증
- 우선순위: P1
- 내용: 상품명 밑줄을 제거하고 이동 표시와 은은한 호버 배경을 적용합니다.
- 완료 기준: 기본·호버 밑줄 없음, 키보드 포커스 및 기존 상세 이동 유지
- 선행 조건: WB59 및 사용자 밑줄 제거 요청
- 검증: Edge 라이트/다크 기본·호버 밑줄 제거, 키보드 포커스·이동 통과. 독립 코드 검토 통과. 기록: docs/reviews/inventory-product-link-style.md

### WB59 | 재고에서 상품 상세 연결

- 상태: done
- 담당: 조정 링크·문서·브라우저 / supplier_ui 상세 화면 / supplier_review 독립검증
- 우선순위: P1
- 내용: 재고 현황·입출고 내역 상품명을 관리자 읽기 전용 상세로 연결합니다.
- 완료 기준: 정확한 상품 ID 연결·없는 상품 안내·관리자 인증·키보드 접근·모바일·독립검증
- 선행 조건: WB53 및 사용자 상품 상세 이동 요청
- 검증: Edge ID·키보드 이동/읽기 전용/모바일/없는 ID/인증 통과, 독립 코드 검토·lint·타입 검사 및 보드 파서5개 통과. 기록: docs/reviews/inventory-product-detail.md

### WB58 | 재고 부족·양호 색상 배지

- 상태: done
- 담당: 조정 구현·브라우저 / supplier_review 독립검증
- 우선순위: P1
- 내용: 부족 빨강·양호 초록 배지와 텍스트/아이콘으로 상태를 구분합니다.
- 완료 기준: 기준이하빨강/초과초록·라이트다크대비·기존판정유지·독립검증
- 선행 조건: 사용자 재고상태 색상 요청
- 검증: Edge 기준 경계값·라이트/다크 대비·모바일 통과, 독립 코드 검토·lint·타입 검사 통과. 기록: docs/reviews/inventory-stock-status.md


### WB57 | 관리자 전체 목록 페이지네이션 통일

- 상태: done
- 담당: supplier_ui 카탈로그목록 / supplier_api 진열·대시보드·보드 / 조정 공통UI·문서·브라우저 / supplier_review 독립검증
- 우선순위: P1
- 내용: 관리자 목록 전체감사 후 공통 페이지/표시개수/조건초기화 패턴 적용.
- 완료 기준: 목록별분할·필터첫페이지·빈결과/축소·전체집계/원본순서/폼/인증보존·모바일·독립검증
- 선행 조건: WB56 및 사용자 전체목록 적용 지시
- 검증: 독립 웹74개·lint·타입·빌드, Edge 일반5/대시보드5/보드4열 및 기존재고 회귀·빈목록·다크모바일 통과. 계획: docs/superpowers/plans/2026-10-26-admin-list-pagination.md / 기록: docs/reviews/admin-list-pagination.md


### WB56 | 재고 목록 페이지네이션

- 상태: done
- 담당: supplier_ui 구현 / supplier_review 독립검증 / 조정 문서·브라우저
- 우선순위: P1
- 내용: 현재재고·입출고·조정기록에 페이지와 표시개수 선택을 적용합니다.
- 완료 기준: 필터후분할·표시개수·조건변경1페이지·빈결과/축소경계·집계보존·키보드모바일
- 선행 조건: WB55 및 사용자 페이지네이션 요청
- 검증: 독립 웹74개·lint·타입, Edge55개페이지/개수선택/조건초기화/집계보존/축소/키보드/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-pagination.md / 기록: docs/reviews/inventory-pagination.md


### WB55 | 재고 작업 상단 배치·출고 통합

- 상태: done
- 담당: supplier_ui 구현 / supplier_review 독립검증 / 조정 문서·브라우저
- 우선순위: P1
- 내용: 등록작업을 목록 위로 옮기고 판매·기타출고를 출고등록의 사유로 통합합니다.
- 완료 기준: 긴목록위작업·출고4사유·조정별도·부호/오류/재시도보존·구URL호환·모바일
- 선행 조건: WB54 및 사용자 업무통합 지시
- 검증: 독립 웹71개·lint·타입, Edge40행상단작업/출고4사유/조정/입고/경계/503재시도/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-outbound-flow.md / 기록: docs/reviews/inventory-outbound-flow.md


### WB54 | 재고 목록 검색·필터와 간격 정리

- 상태: done
- 담당: supplier_ui 구현 / supplier_review 독립검증 / 조정 문서·브라우저
- 우선순위: P1
- 내용: 검색·필터를 가로 도구영역으로 묶고 긴설명을 도움말로 옮겨 목록 가독성을 높입니다.
- 완료 기준: 데스크톱가로/모바일1열·라벨간격·결과표간격·도움말접근·필터/상품범위보존·다크확대
- 선행 조건: WB53 및 사용자 목록가독성 피드백
- 검증: 독립 웹69개·lint·타입 및 Edge24조합 배치/간격/도움말/긴선택/필터보존 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-filter-toolbar.md / 기록: docs/reviews/inventory-filter-toolbar.md


### WB53 | 상품·재고 메뉴 및 화면 분리

- 상태: done
- 담당: supplier_ui 목록·재고 / 조정 메뉴·문서·브라우저 / supplier_review 독립검증
- 우선순위: P1
- 내용: 상품 목록은 상품 관리 및 재고 요약·상품별 재고 링크만 제공하고 재고 현황/변경은 별도 메뉴로 분리합니다.
- 완료 기준: 메뉴 활성상태배타성·상품목록재고표제거·실제SKU요약·정확상품필터·알수없는ID처리·조회해제·기존내역/등록보존·모바일
- 선행 조건: WB52 및 사용자 업무분리 승인
- 검증: 독립 웹69개·lint·타입·빌드, Edge 상품요약/정확ID/없는상품/쿼리/saved/메뉴/모바일12조합 통과. 계획: docs/superpowers/plans/2026-10-26-product-inventory-separation.md / 기록: docs/reviews/product-inventory-separation.md


### WB52 | 재고 요약 카드·내역 전환 통합

- 상태: done
- 담당: supplier_ui 구현 / supplier_review 독립검증 / 조정 문서·브라우저
- 우선순위: P1
- 내용: 상단 요약카드를 내역 전환 버튼으로 사용하고 중복 하단 보기버튼을 제거합니다.
- 완료 기준: 4가지 보기 전환·선택표시·키보드·필터초기화·누계보존·모바일·다크
- 선행 조건: WB43, 사용자 카드 통합 지시
- 검증: 독립 웹66개·lint·타입, Edge4카드전환/키보드/집계/필터/검색/모바일다크 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-summary-navigation.md / 기록: docs/reviews/inventory-summary-navigation.md


### WB51 | 재고 입력 보조작업·필드 정렬

- 상태: done
- 담당: supplier_ui 화면 / supplier_review 독립검증 / 조정 문서·브라우저
- 우선순위: P1
- 내용: 공급처 등록·새로고침 버튼과 긴 옵션 선택/수량 입력 높이·그룹 간격 수정.
- 완료 기준: 동등 버튼 스타일, 라벨간격, 긴옵션 전체정보 접근, 모바일·다크·확대글꼴 정렬, 업무입력 보존
- 선행 조건: WB48 및 사용자 재고화면 피드백
- 검증: 독립 웹66개·lint·타입, Edge18조합 버튼/필드정렬·전체옵션정보·모바일·입력보존 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-form-alignment.md / 기록: docs/reviews/inventory-form-alignment.md


### WB50 | 전화번호 입력 단계 제한 보완

- 상태: done
- 담당: supplier_ui 구현 / supplier_review 독립검증 / 조정 브라우저·문서
- 우선순위: P1
- 내용: 초과 번호가 입력란에 계속 들어가는 WB49 UX 누락을 보완합니다.
- 완료 기준: 타이핑·붙여넣기·자리수·문자 제한, 거절된 입력 안내와 저장 차단, 기존번호 교정, 실제브라우저 검증
- 선행 조건: WB49 및 사용자 화면 피드백
- 검증: 독립 웹66개·lint·타입, Edge 양쪽번호 입력제한/거절후저장차단/명시확인/기존번호교정/목록이동 통과. 계획: docs/superpowers/plans/2026-10-26-supplier-phone-input.md / 기록: docs/reviews/supplier-phone-input.md


### WB49 | 공급처 저장 후 목록 이동·전화번호 검증

- 상태: done
- 담당: supplier_ui 화면 / supplier_api 서버 / 조정 문서·통합 / supplier_review 독립 검증
- 우선순위: P1
- 내용: 등록·수정 확정 후 목록 이동과 결과 안내, 대표전화·담당자 연락처 숫자 길이 검증.
- 완료 기준: 자동 이동·실제 조회 결과 대조·오류 입력 보존·국내11/국제15 경계·기존값 보존·독립 검증
- 선행 조건: WB47, WB48
- 검증: 독립 API256개·웹64개·lint·타입·빌드 및 Edge 저장/오류보존/번호경계/기존값/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-supplier-save-phone.md / 기록: docs/reviews/supplier-save-phone.md


### WB48 | 전체 관리자 폼 너비·간격 점검

- 상태: done
- 담당: inventory_ui 카탈로그 / admin_ui 진열 / 조정 통합 / inventory_review 검증
- 우선순위: P1
- 내용: 복합 등록·수정은 본문폭을 활용하고 모바일1열·공통간격을 적용합니다.
- 완료 기준: 전체폼감사·wide/compact·모바일·간격·다크·저장회귀·독립검증
- 선행 조건: WB47
- 검증: 독립 웹61개·lint·타입·빌드 및 Edge16경로96조합 폭/모바일/간격/저장회귀 통과. 계획: docs/superpowers/plans/2026-10-26-admin-form-layout.md / 기록: docs/reviews/admin-form-layout.md

### WB47 | 국가별 주소 입력과 국내 검색

- 상태: done
- 담당: inventory_api 서버 / inventory_ui 주소폼 / 조정 검색·통합 / inventory_review 검증
- 우선순위: P1
- 내용: 국가 선택 후 국내 검색·직접입력과 해외 직접입력을 제공하고 기존주소를 보존합니다.
- 완료 기준: 국가·주소보존·검색실패/취소/선택·이관·모바일·다크·독립검증
- 선행 조건: WB46, 사용자 국가별 주소 정책 승인
- 검증: 독립 API233개·웹61개·lint·타입·빌드, Edge 주소보존/모의검색/실서비스로딩/모바일 및 실제 schema8 보존 통과. 계획: docs/superpowers/plans/2026-10-26-country-address.md / 기록: docs/reviews/country-address.md

### WB46 | 공장·공급처 상세 정보

- 상태: done
- 담당: inventory_api 서버 / inventory_ui 화면·계약 / 조정 통합 / inventory_review 검증
- 우선순위: P1
- 내용: 영문명·대표자·전화·담당자·주소 등 거래처 정보를 확장합니다.
- 완료 기준: 상세 저장·수정·누락보존·검증경계·이관·간격·모바일·다크
- 선행 조건: WB43, WB45
- 검증: 독립 API221개·웹58개·lint·타입·빌드, Edge 상세입력/수정/오류보존/간격/모바일/다크 및 실제 schema7 보존 통과. 계획: docs/superpowers/plans/2026-10-26-supplier-details.md / 기록: docs/reviews/supplier-details.md

### WB45 | 사이트 다크 모드

- 상태: done
- 담당: inventory_ui 설정 / 조정 토큰·문서·브라우저 / inventory_review 검증
- 우선순위: P1
- 내용: 사이트 설정에서 라이트·다크·시스템 테마를 선택하고 고객·관리자 공통 적용합니다.
- 완료 기준: 저장·초기표시·시스템/탭 동기화·텍스트대비·모바일·독립검증
- 선행 조건: WB23, WB44
- 검증: 독립 웹57개·lint·타입·빌드 및 Edge 저장/OS/탭/차단/폰트/모바일/대비 통과. 계획: docs/superpowers/plans/2026-10-26-dark-mode.md / 기록: docs/reviews/dark-mode.md

### WB44 | 공급처 목록 세로 간격 보정

- 상태: done
- 담당: 조정 담당 구현·브라우저 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 버튼·안내·빈 상태/목록의 간격을 공통 토큰으로 분리합니다.
- 완료 기준: 빈 목록·데이터 목록 간격, 모바일·확대 글꼴, lint·타입 검증
- 선행 조건: WB43
- 검증: 독립 lint·타입·소스, Edge 빈/데이터목록 간격 측정·모바일·확대글꼴 통과. 계획: docs/superpowers/plans/2026-10-26-supplier-spacing.md / 기록: docs/reviews/supplier-spacing.md

### WB43 | 공급처별 입고와 현재 보유 재고 분리

- 상태: done
- 담당: inventory_api 서버 / inventory_ui 현황 / 조정 공급처·통합 / inventory_review 검증
- 우선순위: P1
- 내용: 공장·공급처를 등록해 입고에 연결하고 상품별 현재 보유량과 입출고 내역을 분리합니다.
- 완료 기준: 공급처 검증·원장보존·멱등·현황집계·상품/입고처조회·모바일
- 선행 조건: WB42, 사용자 공급처 등록·선택 승인
- 검증: 독립 API202개·웹55개·lint·타입·빌드, Edge 공급처/현황/내역/재시도/모바일 및 실제 schema6 이관 보존 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-overview.md / 기록: docs/reviews/inventory-overview.md

### WB42 | 재고 흐름별 작업 UI

- 상태: done
- 담당: inventory_ui 구현 / 조정 담당 문서·통합 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 입고·고객 출고·기타 처리의 바로가기와 목적에 맞는 입력·이력을 제공합니다.
- 완료 기준: 업무별 진입·사유·부호·재시도·완료 안내·모바일 검증
- 선행 조건: WB41
- 검증: 독립 웹51개·lint·타입·빌드 및 Edge 업무 진입/사유부호/재시도/완료/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-workflow-ui.md / 기록: docs/reviews/inventory-workflow-ui.md

### WB41 | 선택 메모·이력 자동 이동·재고 흐름 구분

- 상태: done
- 담당: inventory_api 서버 / inventory_ui UI / 조정 담당 계약문서 / inventory_review 검증
- 우선순위: P1
- 내용: 상세사유 선택 입력과 저장 후 이력 이동, 입고·고객출고·기타 흐름 구분을 제공합니다.
- 완료 기준: 빈메모/확정조회완료/자동이동/실패보존/흐름구분/모바일
- 선행 조건: WB40
- 검증: 독립 API197개·웹51개·lint·타입·빌드 및 Edge 공란/재시도/자동이동/실제원장/조회실패/필터/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-flow.md / 기록: docs/reviews/inventory-flow.md

### WB40 | 판매·증정 등 재고 출고 사유 관리

- 상태: done
- 담당: inventory_api 서버 / inventory_ui UI / 조정 담당 계약·문서 / inventory_review 검증
- 우선순위: P1
- 내용: 입고·출고·조정과 사유별 원장 기록·조회 필터를 제공합니다.
- 완료 기준: 사유부호검증/재고경계/재시도/기존이력보존/화면분리완료/모바일
- 선행 조건: WB39, schema4 온라인 백업 완료
- 검증: 독립 API191개·웹50개·lint·타입·빌드 및 Edge7사유/필터/재시도/모바일·schema5보존 통과. 계획: docs/superpowers/plans/2026-10-26-movement-reasons.md / 기록: docs/reviews/movement-reasons.md

### WB39 | 공통 적용 위치와 물음표 도움말

- 상태: done
- 담당: 조정 담당 구현 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 공통 적용을 옵션 선택 아래로 옮기고 긴 설명을 도움말로 접습니다.
- 완료 기준: 작업순서/도움말접근성/공통검증분리/모바일
- 선행 조건: WB38
- 검증: 독립 lint·타입·소스와 Edge 순서/도움말/터치/검증분리/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-bulk-help.md / 기록: docs/reviews/bulk-help.md

### WB38 | 공통 초기 입고와 부족 기준 구분

- 상태: done
- 담당: 조정 담당 구현 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 실제 초기 입고 수량 일괄 적용을 부족 표시 기준과 독립적으로 제공합니다.
- 완료 기준: 독립적용/기존제외보존/합계/오류/모바일
- 선행 조건: WB37
- 검증: 독립 웹48개·lint·타입·빌드 및 Edge 독립일괄/제외보존/합계/경계/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-common-inbound.md / 기록: docs/reviews/common-inbound.md

### WB37 | 관리자 전체 화면 분리·저장 UX 점검

- 상태: done
- 담당: inventory_ui 카테고리 / inventory_api 기준정보 / admin_ui 진열 / 조정 담당 통합 / inventory_review 검증
- 우선순위: P1
- 내용: 전체 관리자 화면을 점검하고 기준정보 화면 분리·대분류 등록·저장 완료 UX를 적용합니다.
- 완료 기준: 전체화면감사/목록입력분리/대분류등록/완료실패복귀/인증모바일
- 선행 조건: WB36
- 검증: 독립 웹48개·lint·타입·빌드 및 Edge 카테고리대분류/세부·기준정보·상품수정·진열 등록수정완료/실패보존/인증/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-admin-ux-audit.md / 기록: docs/reviews/admin-ux-audit.md

### WB36 | 재고 이력 목록과 입고·조정 화면 분리

- 상태: done
- 담당: 조정 담당 구현 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 재고 이력과 입력을 별도 URL로 나누고 목록·등록 분리 규칙을 필수화합니다.
- 완료 기준: 목록폼없음/입력이력없음/등록·완료·복귀링크/인증/모바일
- 선행 조건: WB35
- 검증: 독립 웹48개·lint·타입·빌드 및 Edge 화면분리/완료복귀/인증/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-screens.md / 기록: docs/reviews/inventory-screens.md

### WB35 | 재고 변경 완료 안내와 공통 저장 UX

- 상태: done
- 담당: inventory_ui 구현 / 조정 담당 계약·문서 / inventory_review 검증
- 우선순위: P1
- 내용: 재고 변경 전후 완료 화면과 재사용 저장 결과 및 필수 검증 규칙을 제공합니다.
- 완료 기준: 확정응답/전후수량/실패보존/재조회실패분리/포커스/모바일/독립검증
- 선행 조건: WB34
- 검증: 독립 웹48개·lint·타입·빌드와 Edge 전후수량/완료포커스/재시도/조회실패/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-inventory-feedback.md / 기록: docs/reviews/inventory-feedback.md

### WB34 | 조합별 재고 부족 기준과 일괄 적용

- 상태: done
- 담당: inventory_api API / inventory_ui UI / inventory_review 검증 / 조정 담당
- 우선순위: P1
- 내용: 각 조합의 기준을 입력하고 등록 대상에 공통값을 명시적으로 적용합니다.
- 완료 기준: 개별저장/일괄적용범위/입력보존/경계검증/모바일
- 선행 조건: WB33
- 검증: 독립 API168개·웹46개·lint·타입·빌드 및 Edge 일괄/개별수정/제외/입력보존/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-option-thresholds.md / 기록: docs/reviews/option-thresholds.md

### WB33 | 재고 기준 설명과 표 중앙 정렬

- 상태: done
- 담당: 조정 담당 구현 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 재고 기준 설명과 관리 표 중앙 정렬을 통일합니다.
- 완료 기준: 기준설명정확/중앙정렬/접근성이름/모바일 확인
- 선행 조건: WB32
- 검증: 독립 소스·lint·타입 및 Edge 중앙정렬/접근성이름/모바일/입력회귀 통과. 계획: docs/superpowers/plans/2026-10-26-table-alignment.md / 기록: docs/reviews/table-alignment.md

### WB32 | 조합 제외와 옵션별 초기 재고

- 상태: done
- 담당: inventory_api API / inventory_ui UI / inventory_review 검증 / 조정 담당
- 우선순위: P1
- 내용: 조합별 제외·복원과 초기 입고 수량을 한 번에 저장합니다.
- 완료 기준: 제외조합미생성/개별수량/원장원자저장/기존재고보존/재시도/모바일
- 선행 조건: WB31
- 검증: 독립 API160개·웹45개·lint·타입·빌드, Edge 제외/복원/초기수량/실패보존/완료/모바일 및 실제BFF 경계 통과. 계획: docs/superpowers/plans/2026-10-26-selected-options-stock.md / 기록: docs/reviews/selected-options-stock.md

### WB31 | 다중 색상·사이즈 일괄 등록과 완료 안내

- 상태: done
- 담당: inventory_api API / inventory_ui UI / inventory_review 검증 / 조정 담당
- 우선순위: P1
- 내용: 다중 선택 조합의 일괄 저장과 명확한 완료 화면을 제공합니다.
- 완료 기준: 원자적 저장/기존조합제외/완료피드백/오류보존/모바일/독립검증
- 선행 조건: WB30
- 검증: 독립 API144개·웹42개·lint·타입·빌드 및 Edge 조합/실패보존/완료포커스/재시도/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-batch-options.md / 기록: docs/reviews/batch-options.md

### WB30 | 색상·사이즈 기준정보와 자동 옵션 코드

- 상태: done
- 담당: inventory_api API / inventory_ui UI / inventory_review 검증 / 조정 담당
- 우선순위: P1
- 내용: 관리자 기준정보·콤보박스·즉시 반영과 SKU 코드 자동 생성을 제공합니다.
- 완료 기준: 기준값 관리/검증/반영·자동코드·기존SKU/재고/원장이관보존·모바일 확인
- 선행 조건: WB29, schema3 온라인 백업 완료
- 검증: 독립 API126개·웹40개·lint·타입·빌드 통과. Edge 빠른추가/자동선택/재조회/모바일, 실제BFF와schema4보존 확인. 계획: docs/superpowers/plans/2026-10-26-option-domains.md / 기록: docs/reviews/option-domains.md

### WB29 | 게시 상태 컬럼과 상세 사유

- 상태: done
- 담당: inventory_ui 구현 / inventory_review 검증 / 조정 담당
- 우선순위: P1
- 내용: 게시 상태와 짧은 사유를 별도 열로 표시하고 hover·포커스·탭 상세를 제공합니다.
- 완료 기준: 사유 정확성·게시미연결 명시, 접근 방식·모바일·표스크롤 검증
- 선행 조건: WB28
- 검증: 독립 소스·lint·타입, Edge 4상태/hover/focus/touch/긴설명/모바일/삭제회귀 통과. 계획: docs/superpowers/plans/2026-10-26-publication-column.md / 기록: docs/reviews/publication-column.md

### WB28 | 상품 상태 아이콘 배지

- 상태: done
- 담당: 조정 담당 구현 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 준비·게시 상태에 아이콘과 색상 배지를 적용합니다.
- 완료 기준: 상태별 명확한 구분, 라벨·수량 유지, 모바일·강제색상 검증
- 선행 조건: WB27
- 검증: 독립 소스·lint·타입, Edge 4상태/미게시/모바일/강제색상 통과. 계획: docs/superpowers/plans/2026-10-26-status-badges.md / 기록: docs/reviews/status-badges.md

### WB27 | 상품 준비 상태와 완료 작업 배치

- 상태: done
- 담당: inventory_api API / inventory_ui UI / inventory_review 검증 / 조정 담당
- 우선순위: P1
- 내용: 옵션·현재 재고 준비 상태를 목록에 표시하고 완료 작업을 한 그룹으로 배치합니다.
- 완료 기준: 상태4종·소진·미게시 구분, 버튼 배치·초기화·모바일 검증
- 선행 조건: WB26
- 검증: 독립 API119·웹37·lint·타입·빌드, 실제 Edge4상태/소진/미게시/버튼같은행/초기화/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-product-readiness.md / 기록: docs/reviews/product-readiness.md

### WB26 | 등록 상품 행 세로 정렬

- 상태: done
- 담당: 조정 담당 구현 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 작업 버튼과 상품 텍스트를 행의 세로 중앙에 정렬합니다.
- 완료 기준: 줄바꿈·확대·모바일 정렬 확인, 다른 테이블 범위 보존
- 선행 조건: WB25
- 검증: 독립 CSS 범위 검토, Edge 짧은/긴 내용·기본/확대·390/1440px 정렬 통과. 계획: docs/superpowers/plans/2026-10-26-product-row-alignment.md / 기록: docs/reviews/product-row-alignment.md

### WB25 | 상품 삭제와 목록 작업 버튼

- 상태: done
- 담당: inventory_api API / inventory_ui UI / inventory_review 검증 / 조정 담당
- 우선순위: P1
- 내용: 미연결 상품 삭제와 목록 작업 버튼 스타일을 제공합니다.
- 완료 기준: 서버 권한·버전·연결 보호, 삭제 확인/취소/실패/성공, 모바일·키보드 검증
- 선행 조건: WB24
- 검증: 독립 API118·웹35·lint·타입·빌드, 실제BFF인증/입력과모의UI취소/연결보호/충돌/실패/성공/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-product-delete.md / 기록: docs/reviews/product-delete.md

### WB24 | 상품 등록 완료와 다음 작업 안내

- 상태: done
- 담당: inventory_ui 구현 / inventory_review 독립 검증 / 조정 담당
- 우선순위: P1
- 내용: 상품 등록 성공 후 완료 화면과 색상·사이즈 등록/목록 이동을 제공합니다.
- 완료 기준: 성공 결과·포커스·다음 단계, 실패 입력 유지·중복 클릭·모바일 검증
- 선행 조건: WB23
- 검증: 독립 웹33개·lint·타입 및 Edge 완료/실패/잠금/다음 옵션 자동 선택/재등록/수정 회귀 통과. 계획: docs/superpowers/plans/2026-10-26-product-completion.md / 기록: docs/reviews/product-completion.md

### WB23 | 사이트 설정의 공통 구조

- 상태: done
- 담당: inventory_ui 구현 / inventory_review 독립 검증 / 조정 담당
- 우선순위: P1
- 내용: 사이트 설정 셸·분류·개별 설정을 분리하고 확장 기준을 정의합니다.
- 완료 기준: 사이트 설정/화면 및 접근성/글자 크기 계층, 재사용 구조와 확장 문서, 기존 동작 검증
- 선행 조건: WB22
- 검증: 독립 소스·웹33개·lint·타입 및 실제 Edge 계층/키보드/저장/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-site-settings.md / 기록: docs/reviews/site-settings.md

### WB22 | 톱니바퀴 화면 설정 패널

- 상태: done
- 담당: inventory_ui 구현 / inventory_review 독립 검증 / 조정 담당
- 우선순위: P1
- 내용: 글자 크기 상단 바를 헤더 설정 버튼과 별도 패널로 정리합니다.
- 완료 기준: 설정 진입·닫기·포커스·크기 저장 유지·모바일 검증
- 선행 조건: WB21
- 검증: 독립 소스·lint·타입 및 Edge 설정 진입/포커스/닫기/모바일/저장 복원 통과. 계획: docs/superpowers/plans/2026-10-26-display-settings.md / 기록: docs/reviews/display-settings.md

### WB21 | 사용자 글자 크기 설정

- 상태: done
- 담당: inventory_ui 구현 / inventory_review 독립 검증 / 조정 담당
- 우선순위: P1
- 내용: 기본 글자 가독성과 사용자별 브라우저 글자 확대 설정을 제공합니다.
- 완료 기준: 크기 변경/복원/저장 실패 대응, 키보드·모바일·폼 회귀 검증
- 선행 조건: WB20
- 검증: 독립 웹33개·lint·타입·빌드, 실제 브라우저 확대/복원/초기화/저장 실패/교차탭/키보드/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-text-size.md / 기록: docs/reviews/text-size.md

### WB20 | 필수 입력 기호 표시

- 상태: done
- 담당: 조정 담당 구현 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 반복되는 필수 텍스트를 별표로 바꾸고 폼별 공통 안내를 제공합니다.
- 완료 기준: 공통 라벨·폼 안내·디자인 문서 동기화, 기존 검증 유지
- 선행 조건: WB19
- 검증: 독립 소스·타입 검사 및 Edge 표시/필수 검증/키보드/모바일 통과. 계획: docs/superpowers/plans/2026-10-26-required-marker.md / 기록: docs/reviews/required-marker.md

### WB01 | 로컬 개발 기반

- 상태: done
- 담당: 프론트·백엔드 구현 / 독립 검증
- 우선순위: P0
- 내용: Next.js와 FastAPI를 Docker 없이 로컬에서 실행합니다.
- 완료 기준: 환경 설정, 테스트 및 웹·API 연결 확인
- 선행 조건: 없음
- 검증: 이전 단계 검증 완료 · docs/reviews/local-development.md

### WB02 | 상품 중심 홈과 관리자 진열

- 상태: done
- 담당: 상품 API·프론트 구현 / 독립 검증
- 우선순위: P0
- 내용: 샘플 상품 12개, 카테고리·기획전, /about 분리와 진열 편집을 제공합니다.
- 완료 기준: 관리자 저장 후 홈 반영, 권한 거부·충돌 처리, 모바일 탐색
- 선행 조건: WB01
- 검증: 이전 단계 검증 완료 · docs/reviews/category-storefront.md

### WB03 | 상품 자동 슬라이드

- 상태: done
- 담당: 슬라이드 구현 / 통합·접근성 검증
- 우선순위: P1
- 내용: 한 화면에 들어가지 않는 상품을 넘겨 보며 자동 재생을 제어합니다.
- 완료 기준: 넘침 조건에서만 동작, 이전·다음·정지, 포커스·동작 줄이기 대응
- 선행 조건: WB02
- 검증: 독립 소스·빌드 검증 및 Edge PC/모바일 통합 검증 완료 · docs/reviews/carousel-footer-workboard.md

### WB04 | 회사 정보·메뉴·정책 하단

- 상태: done
- 담당: 공통 화면 구현 / 독립 검증
- 우선순위: P1
- 내용: 일반 쇼핑몰 하단 구조와 실제 연결되는 정책 초안 페이지를 만듭니다.
- 완료 기준: 모바일 배치, 모든 링크 연결, 미등록 정보와 정책 초안 명시
- 선행 조건: WB02
- 검증: 독립 소스·빌드 검증 및 Edge PC/모바일 통합 검증 완료 · docs/reviews/carousel-footer-workboard.md

### WB05 | 공유 작업 보드

- 상태: done
- 담당: 보드 구현 / 독립 검증
- 우선순위: P1
- 내용: 완료·진행·다음 제안·결정할 일을 함께 확인합니다.
- 완료 기준: 단일 데이터 원본, 책임·우선순위·수용 기준·의존성 표시, 고객 메뉴에서 분리
- 선행 조건: WB01
- 검증: 독립 소스·빌드 검증 및 Edge PC/모바일 통합 검증 완료 · docs/reviews/carousel-footer-workboard.md

### WB06 | 상품·SKU·재고 로컬 관리 기반

- 상태: done
- 담당: 백엔드·상품 담당 / 재고 검증 담당
- 우선순위: P0
- 내용: 관리자 초안 상품·색상·사이즈 SKU와 수동 재고 원장을 로컬 SQLite에 저장합니다. 고객 게시와 주문 예약은 후속입니다.
- 완료 기준: DB 선택 근거, 옵션 중복 방지, 수량 변경 사유·이력, 동시 변경 검증
- 선행 조건: 로컬 SQLite 선택 기록, 초기 수동 증감 범위. 운영 DB/거래 정책은 미정 유지
- 검증: 독립 API80개·웹29개·lint·타입 검사·빌드 및 브라우저 등록/수정/재고·중복 재시도·모바일 검증 통과. 계획: docs/superpowers/plans/2026-10-26-catalog-inventory.md / 기록: docs/reviews/catalog-inventory.md

### WB07 | 관리자 계정·권한 방식 결정

- 상태: decision
- 담당: 사용자·기술 담당
- 우선순위: P0
- 내용: 로컬 공용 접근 키를 대체할 운영 관리자 로그인과 역할 범위를 정해야 합니다.
- 완료 기준: 계정 발급·복구·역할·서버 권한 검증 범위 합의
- 선행 조건: 운영 인원과 역할 확인
- 검증: 미정

### WB08 | 판매·결제 범위 결정

- 상태: decision
- 담당: 사용자·운영 담당
- 우선순위: P1
- 내용: 전시·문의·주문 중 초기 서비스 범위와 실제 결제 도입 여부를 결정합니다.
- 완료 기준: 판매·배송 방식 및 결제 도입 여부 명시, 업체는 검토 후 결정
- 선행 조건: 사업 운영 방식 확인
- 검증: 미정 · PG 미선정

### WB09 | 의류 시안 프로그램 범위 결정

- 상태: decision
- 담당: 사용자·디자인·기술 담당
- 우선순위: P1
- 내용: 내부용/고객용, 2D/3D와 초기 편집·내보내기 범위를 좁힙니다.
- 완료 기준: 사용자·템플릿·편집 도구·저장/출력 규격 합의
- 선행 조건: 시안 사용 목적 확인
- 검증: 미정 · AI 도입 미확정

### WB10 | Markdown 원본과 프로젝트 관리 연결

- 상태: done
- 담당: markdown_board 구현 / markdown_board_review 독립 검증 / 조정 담당 통합
- 우선순위: P1
- 내용: 루트 workboard.md를 단일 원본으로 관리하고 기존 URL에 보드와 원문을 제공한다.
- 완료 기준: 문서 수정 후 새로고침 반영, 기존 작업 보존, 오류 안내, 프로젝트 갱신 절차 연결
- 선행 조건: WB05
- 검증: 테스트 15개·lint·타입 검사·빌드 및 실제 문서 수정/복구·모바일 확인 완료. 계획: docs/superpowers/plans/2026-10-25-markdown-workboard.md / 기록: docs/reviews/markdown-workboard.md

### WB11 | 관리자 홈과 로컬 로그인

- 상태: done
- 담당: admin_session 서버 / admin_ui 화면 / 독립 검증 및 조정 담당
- 우선순위: P1
- 내용: /admin 홈에서 관리 메뉴에 접근하고 로그인 화면과 로컬 테스트 바로 로그인을 제공한다.
- 완료 기준: 홈/메뉴 진입·새로고침 유지·로그아웃, 미인증 접근 차단, 운영 테스트 로그인 비활성화 검증
- 선행 조건: WB02, WB10. 운영 다중 계정/권한 결정 WB07은 별도 유지
- 검증: 독립 테스트 20개·lint·타입 검사·빌드 및 실제 로그인/저장/로그아웃·운영 테스트 로그인 차단 통과. 계획: docs/superpowers/plans/2026-10-26-admin-home-login.md / 기록: docs/reviews/admin-home-login.md

### WB12 | 관리자 업무 현황 대시보드

- 상태: done
- 담당: dashboard_api 서버 / dashboard_ui 화면 / 독립 검증·조정 담당
- 우선순위: P1
- 내용: 처리 업무, Q&A, 의류 입고, 배송 상태, 재고를 관리자 홈에 통합 표시한다.
- 완료 기준: 인증된 조회, 목록과 일치하는 요약, 샘플 구분, 필터·메뉴·모바일·오류 처리 검증
- 선행 조건: WB11. 실제 데이터 영속화와 운영 정책은 WB06·WB07·WB08 후속
- 검증: 독립 API48개·웹25개·lint·타입 검사·빌드 및 브라우저 PC/모바일·필터·오류 재시도 통과. 계획: docs/superpowers/plans/2026-10-26-admin-dashboard.md / 기록: docs/reviews/admin-dashboard.md

### WB13 | 대시보드 재고 현황 실제 데이터 연결

- 상태: done
- 담당: inventory_dashboard_impl 구현 / inventory_dashboard_verify 독립 검증 / root 통합·문서
- 우선순위: P1
- 내용: 로컬 등록 SKU 잔고와 확인 기준 수량을 관리자 홈 재고 요약·목록에 연결하고 다른 합성 샘플 영역과 구분합니다.
- 완료 기준: 재고 변경 후 홈 재조회에 반영, 요약과 목록 일치, 빈 데이터·조회 오류·모바일 검증
- 선행 조건: WB06. 주문 예약·판매 가능 수량·배송 자동 연동은 별도 범위
- 검증: API61/독립API22·웹20·type/lint·독립4보기/실제조회일치/모의갱신/링크·필터·오류·권한 통과. 원본 업무쓰기0·catalog전후동일. docs/superpowers/plans/2026-10-28-dashboard-inventory.md / docs/reviews/dashboard-inventory.md

### WB14 | 상품 등록·목록 화면 분리와 쉬운 용어

- 상태: done
- 담당: inventory_ui 구현 / inventory_review 독립 검증 / 조정 담당
- 우선순위: P1
- 내용: 상품 등록·색상/사이즈 등록으로 용어를 바꾸고 목록과 등록·수정 화면을 분리합니다.
- 완료 기준: 별도 URL과 목록 복귀, 양식 없는 목록, 저장·오류·인증·모바일 검증
- 선행 조건: WB06
- 검증: 독립 웹29개·lint·타입 검사·빌드, 브라우저 목록/등록/수정/재고·인증·모바일 통과. 계획: docs/superpowers/plans/2026-10-26-catalog-screens.md / 기록: docs/reviews/catalog-screens.md

### WB15 | 내부 관리명 자동 생성과 상품 카테고리 선택

- 상태: done
- 담당: inventory_api 서버 / inventory_ui 화면 / inventory_review 독립 검증 / 조정 담당
- 우선순위: P1
- 내용: 내부 관리명과 고객 표시명을 구분하고 카테고리별 등록 순번으로 내부명을 발급합니다. 카테고리는 선택형으로 제공합니다.
- 완료 기준: 동시 등록 번호 유일성·수정 후 고정·기존 데이터 이관 보존·카테고리 서버 검증·화면/모바일 검증
- 선행 조건: WB06, WB14. 기존 SQLite v1 백업 완료
- 검증: 독립 API93개·웹31개·lint·타입 검사·빌드, 브라우저 두 이름/카테고리·모바일 및 DB 이관 보존 확인. 계획: docs/superpowers/plans/2026-10-26-product-names.md / 기록: docs/reviews/product-names.md

### WB16 | 세부 카테고리·계절과 내부 관리명 확장

- 상태: done
- 담당: inventory_api 서버 / inventory_ui 화면 / inventory_review 독립 검증 / 조정 담당
- 우선순위: P1
- 내용: 대분류·세부분류 관리와 계절 선택을 제공하고 분류·계절 조합별로 내부 관리명을 발급합니다.
- 완료 기준: 분류 관리·계절 정규화·조합별 동시 번호·이관/기존명 보존·인증·모바일 검증
- 선행 조건: WB15. 기존 SQLite v2 백업 완료
- 검증: 독립 API104개·웹33개·lint·타입 검사·빌드, 브라우저 분류/계절/충돌/모바일 및 DB 보존 통과. 계획: docs/superpowers/plans/2026-10-26-category-seasons.md / 기록: docs/reviews/category-seasons.md

### WB17 | 관리자 선택 컨트롤 스타일 개선

- 상태: done
- 담당: 조정 담당 구현 / inventory_review 독립 검증
- 우선순위: P1
- 내용: 카테고리 드롭다운과 계절·사용 여부 체크박스의 스타일을 통일합니다.
- 완료 기준: 선택/포커스/비활성 구분, 모바일 배치, 기존 선택 동작과 키보드 유지
- 선행 조건: WB16
- 검증: 독립 웹33개·lint·타입 검사, 실제 모바일/키보드/선택 상태 검증 통과. 계획: docs/superpowers/plans/2026-10-26-catalog-controls.md / 기록: docs/reviews/catalog-controls.md

### WB18 | 공통 폼 디자인 시스템과 선택 카드 개선

- 상태: done
- 담당: inventory_ui 구현 / inventory_review 독립 검증 / 조정 담당
- 우선순위: P1
- 내용: 입력창·선택창·텍스트 영역을 통일하고 계절 선택을 공통 선택 카드로 개선합니다. 피드백을 재사용 규칙과 개발 절차에 반영합니다.
- 완료 기준: 공통 컴포넌트/토큰, 일관된 모서리·상태, 키보드·모바일 검증, 문서 적용법과 절차 갱신
- 선행 조건: WB17
- 검증: 독립 웹33개·lint·타입·빌드, 실제 입력/선택 상태·키보드·모바일 통과. 계획: docs/superpowers/plans/2026-10-26-form-design-system.md / 기록: docs/reviews/form-design-system.md

### WB19 | 필수 입력 표시와 드롭다운 옵션 디자인

- 상태: done
- 담당: inventory_ui 구현 / inventory_review 독립 검증 / 조정 담당
- 우선순위: P1
- 내용: 필수·선택·자동 생성 항목을 표시하고 펼친 옵션 목록까지 공통 디자인을 적용합니다.
- 완료 기준: 필수값 검증/포커스, 키보드·닫기·비활성·모바일 검증, 기존 편집 예외 보존
- 선행 조건: WB18
- 검증: 독립 웹33개·빌드, 최종 lint·타입 검사 및 실제 브라우저 필수값/포커스/키보드/비활성/모바일/기존 편집 통과. 계획: docs/superpowers/plans/2026-10-26-required-select.md / 기록: docs/reviews/required-select.md
















































