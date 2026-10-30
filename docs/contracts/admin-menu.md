# WB112 / R109 관리자 메뉴 그룹 계약

사용자 승인: 관리자 GNB 그룹화, 그룹 이름/순서·메뉴 배치/순서·그룹/메뉴 표시/숨김 관리. 범위 관리자만, 숨김은 권한 차단 아님. 그룹 접기/펼치기는 사이드바 로컬 UI 상태. 새 권한체계/고객 메뉴/외부 URL 없음.

## 단일 계약
GET/PUT /api/v1/admin/navigation (기존 require_admin). 응답/PUT은 {revision: integer 0..9_007_199_254_740_990, groups: Group[1..8]}. Group={id: 영숫자_- 1..64, label: trim된 비공백 1..40, visible:boolean, items:Item[0..9]}. Item={id:MenuId,visible:boolean}. 모든 필드 strict, 추가필드 거부. group id 중복 금지, 9개 MenuId는 전체에 정확히 한번씩. 메뉴 삭제는 숨김으로 하고 그룹 삭제는 비어있는 그룹만 가능. revision 낙관잠금409, 성공+1, 쓰기 원자적, no-store. 요청 최대32KiB 서버/BFF 양쪽. 저장소 별도 .local/admin-navigation.sqlite3; create_app admin_navigation_path 주입 지원, catalog_path가 있으면 그 부모 아래 별도 파일. 기본값은 Python/TS에 동일한 4그룹. 영속화 이전 기본 revision0.

MenuId→label→href:
- home / 관리자 홈 / /admin
- catalog / 상품 관리 / /admin/catalog
- inventory / 재고 관리 / /admin/catalog/inventory
- factories / 공장 협업 / /admin/factories
- designs / 의류 디자인 / /admin/designs
- site / 사이트 관리 / /admin/site
- reviews / 리뷰 관리 / /admin/reviews
- workboard / 작업 보드 / /admin/workboard

기본 그룹: operations/운영 [home,catalog,inventory], production/제작·협업 [factories,designs], site-customer/사이트·고객 [site,reviews], project/프로젝트 [workboard], 모두 visible=true.

## 프런트 계약 및 화면
lib/admin-menu.ts: MenuId 및 상수 MENU_ITEMS(배열 {id,label,href}), DEFAULT_ADMIN_MENU={revision:0,groups}, parseAdminMenu(value) 엄격 검증, 타입 AdminMenuState, AdminMenuGroup, AdminMenuItem. 모듈 소유 frontend. Next BFF GET/PUT /api/admin/navigation: 기존 session/Origin 보호, 인증 토큰 클라이언트 노출 없음. 오류 401/409/413/422/503 구분.

/admin/navigation 상태(읽기 전용 현재 저장 설정) → /admin/navigation/edit 편집 → SaveResult → 상태. 별도 추가 목록 없음: 단일설정 문서에 그룹/메뉴 편집 대상만 표시하는 예외. 그룹 이름 수정, 추가/빈 그룹 삭제, 그룹/메뉴 위아래, 메뉴 그룹 이동(select), 그룹/메뉴 visible checkbox. 저장된 revision과 그룹수/보이는 메뉴수 확정값, 완료 포커스. 실패 입력 보존. 충돌/결과불확실이면 입력 유지 및 저장 잠금, 최신조회→명시적 현재입력 유지/새 버전기준 재저장 제공. 조회 실패와 저장 성공 구분. UI 미저장 기본복원 가능, 저장 전 적용되지 않음.

저장 성공 시 window.dispatchEvent(new CustomEvent('admin-navigation-updated', {detail: 확정 AdminMenuState})); root 소유 sidebar는 수신해 갱신. 초기GET 실패는 기본 메뉴+명시적 조회실패/재시도, 저장된 설정인 척하지 않음. route 변화시 조회해 다른 탭 수정도 반영, 취소 요청/오래된 응답 방지. 보이는 자식 없는 그룹 제외. 현재 메뉴 그룹 초기 펼침, aria-current 기존 adminSection 재사용. /admin/navigation(/edit)는 고정 '메뉴 관리' 진입 활성; 이 링크는 표시 설정 대상 아님. 로그인/설정/로그아웃도 숨기지 않음. 모바일 전체 메뉴 토글 유지. 숨긴 route도 기존 인증으로 직접 접근.

## 소유권
backend: services/api/app/admin_navigation.py, tests/test_admin_navigation.py, main.py 최소 등록/경로인자. frontend: lib/admin-menu.ts, tests/admin-menu.test.ts, app/api/admin/navigation/route.ts, app/admin/(protected)/navigation/**. root: admin-navigation.tsx, admin.css, lib/admin-navigation.ts, site/page.tsx, 문서/보드/통합. DB/실사용 설정을 테스트로 변경하지 않고 합성서버/DB 사용.

WB114: 고정 복구 영역에 /admin/guide 사용 가이드 링크 추가. 그룹/표시 설정 대상8개는 그대로 유지하며 기존 저장데이터 마이그레이션 없음.

## WB119 확장
payment-preparation / PG 도입 준비 / /admin/payment-preparation을 기본 프로젝트 그룹에 추가. 기존 정확한8개 legacy 문서는 구조검증 후 workboard소속 그룹에 visible true로 추가하여 읽으며 그룹숨김/순서/버전/DB원문을 보존한다. 조회만으로 DB를 수정하지 않는다. 신규 저장은9개 전체가 필수이며 구8개 PUT는422로 거부하여 최신조회 필요. 화면은 관리자 인증이 필요한 읽기전용 안내이며 작업 상태는 작업보드 링크로 확인한다.
