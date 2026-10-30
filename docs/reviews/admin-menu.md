# WB112 / R109 관리자 메뉴 그룹·표시 관리 검증

## 범위 및 계약
사용자 승인대로 그룹 이름/추가/빈그룹삭제/그룹순서/메뉴그룹 이동·순서/그룹·메뉴 표시 여부를 구현. 계약 docs/contracts/admin-menu.md, 계획 docs/superpowers/plans/2026-10-30-admin-menu.md. 소유 backend(menu_backend), frontend(menu_frontend), 통합(root), 독립(menu_review).
변경 파일: services/api/app/admin_navigation.py, main.py 등록/경로주입, tests/test_admin_navigation.py; apps/web/src/lib/admin-menu.ts, tests/admin-menu.test.ts, app/api/admin/navigation/route.ts, app/admin/(protected)/navigation/**; admin/admin-navigation.tsx, admin.css, protected/site/page.tsx, components/ui/management-lists.css. 기존 상품/재고/회원/브랜드 데이터 변경 없음.

## 자동/독립 검증
- Backend 메뉴27 + 브랜드21 =48 통과(합성임시DB). 인증·추가필드/타입/경계/중복/누락/외부URL·32KiB·전부숨김·409·동시쓰기1승1충돌·재시작·저장소503.
- root 전체 웹192 통과, TypeScript 및 변경 TSX/DTO/BFF ESLint 통과.
- 독립 menu_review: API27 + DTO/경로6 재실행 통과. 모바일 설정 dialog Escape를 sidebar가 가로채는 P2 발견→dialog 이벤트 제외 수정→실제 닫힘 확인. 추가 차단 이슈 없음.

## 실제 브라우저 검증
실제 Next/FastAPI, 합성키/DB, API8119와 web127.0.0.2:3119 사용. 기존localhost/127.0.0.1 사용자 쿠키·DB 격리. UI 복사본은 .local/wb112-web, DB .local/wb112-qa. 파일/상품/회원 데이터 복사 없음. 의존성만 기존 설치 연결; 별도 worktree 아님.
- 직접 편집URL 미로그인→login, 합성키로 로그인. 상태화면 form0, 편집 별도URL.
- 그룹명 운영 관리, 상품관리 위로, 작업보드 소속이동, 빈그룹삭제, 제작그룹숨김 저장rev1. SaveResult 확정 그룹3/메뉴6, 사이드바 즉시 일치.
- 모바일390 저장 완료 focus가 h2, 가로넘침 없음. 기본복원 입력은 저장전 미적용, 저장rev2.
- 모든그룹숨김rev3에서 고정 메뉴관리/설정/로그아웃 남음. 메뉴관리→편집으로 기본복원 가능.
- 두창 동시편집: 뒤늦은 저장409, 입력 보존/완료표시없음/저장잠금. 최신조회가 입력을 바꾸지 않고 명시적 rebase 후 저장성공.
- 합성API중지→저장503·입력 보존·잠금·완료표시없음. 최신조회도 실패시 입력보존. API재시작→최신확인→rebase→기본복원 저장. 저장성공은 추가조회에 의존하지 않고 확정 응답만으로 표시.
- 개별 리뷰메뉴 숨김 및 그룹순서 저장rev8, 사이드바 순서/표시메뉴7 일치. 마지막 합성설정은 기본구성rev9.
- 그룹 추가 후 이름input focus/전체선택; 키보드 Home/Enter로 메뉴 그룹이동 후 새 FormSelect trigger focus 복원.
- 그룹 접기/Enter 펼치기 검증. 모바일 메뉴→설정→Escape: dialog닫힘/menu열림유지/설정버튼focus, 다음Escape 메뉴닫힘.
- 390px 기본/20px다크,1440px다크 검증. 가로넘침 없음. 예시 증거 .local/wb112-save-mobile.jpg, .local/wb112-menu-desktop.jpg.
- 실개발 API8100 해당 endpoint 미인증401, 웹3100 메뉴관리 URL 로그인화면200 확인. 실설정 PUT 없음.

## 한계/복구
기존 관리자 토큰 인증과 권한은 변경하지 않음; 숨김은 직접URL 접근 차단이 아님. 실제 사용자 세션 로그아웃은 하지 않음. 신규 의존성/배포/push 없음. 기존 미커밋 보존. 복구는 변경소스와 별도 admin-navigation.sqlite3 백업 복원; 설정 변경은 메뉴관리에서 기본구성 불러오기 후 명시적 저장. 초기 QA 기동은 의존성 연결 전 실패하여 해당 QA 프로세스 트리만 중단 후 연결을 준비해 재시작했다. 사용자 서버는 중단하지 않았다.

최종 독립검증 menu_review 완료 승인. QA 탭 닫기/뷰포트 복원/합성서버 종료/.local/wb112-web/.next 캐시 정리 완료. QA 소스/DB/증거는 재현용 보존, 의존성 연결 부모 일괄삭제 안 함. 운영 변경/통합커밋 없음.
