# WB85 / R93 공장 본인 프로필 검증

## 범위와 구현
관리자 발급 계정의 이름·비밀번호를 본인이 수정한다. 아이디·소속·권한·활성 여부는 수정할 수 없다. 기존 모델의 필드만 사용한다. root 조정/문서, profile_api 서버·테스트, profile_ui UI, factory_verify 독립검증. 기존 C:/projects/re-tbms-mall에서 파일별 소유권으로 진행했으며 추가 worktree/서버/운영 배포 없음.

파일: services/api/app/factory.py, services/api/tests/test_factory_profile.py; apps/web/src/lib/factory.ts 및 factory-proxy.ts, app/api/factory/profile/route.ts, app/factory/(protected)/profile/edit/page.tsx, factory-profile-edit.tsx/css, factory-shell.tsx/css.

## 실행 증거
- 구현자 frontend typecheck 및 대상 ESLint exit0.
- root 세션3/작업보드5 테스트8/8 통과.
- 독립 브라우저: 1440/390px × light/dark 실제본문24px 4보기 넘침 없음. 422/429 이름보존·민감값삭제·오류포커스,409/503 재제출 차단/최신조회 후 입력 이름 보존, 성공 SaveResult 서버확정값/비밀번호변경 안내/모바일포커스/대시보드 복귀·중복제출 차단 통과. 실제 PUT은 모킹하여 기존 계정 비밀번호를 변경하지 않았다. 근거 .local/wb85-profile-review.cjs/json 및 wb85-profile-*.png. root 데스크톱 편집 화면 이미지 확인.
- 독립 API 신규 보안 테스트18/18 exit0 (86.15초, .local/pytest-profile-independent-open 임시DB). 본인범위·불변필드·비밀번호/반복실패·충돌·다른세션폐기·현재세션유지·비활성계정/공장거부 확인. 인증 만료 모킹에서 세션DELETE 및 로그인 정착, 로그아웃 후 수정 직접URL차단도 exit0. 구현자 추가 회귀 결과는 아래에 기록한다.

## 경계와 복구
프로필 카드에는 입력폼을 넣지 않고 수정 링크만 제공한다. 저장 성공은 후속 헤더 재조회 실패와 분리한다. 비밀번호 변경은 현재 비밀번호 확인 후 다른 세션만 폐기한다. 원본 업무 데이터 쓰기 없음; 임시DB 테스트와 UI모킹은 실제 원본계정 비밀번호 변경 통합 실행으로 표현하지 않는다. 기존 개발 테스트 계정 비밀번호를 사용자가 바꾸면 바로로그인 설정의 자격증명도 로컬에서 갱신해야 하며 기존 값은 자동 덮어쓰지 않는다.

DB 마이그레이션 없음. 복구는 추가 프로필 경로/메서드/UI 변경만 되돌린다. 사용자 변경 비밀번호를 이전 값으로 자동 복원하지 않는다. 커밋/푸시/배포 없음.

후속 UI: 공장 범용 버튼 선택자의 우선순위로 저장 버튼 채움이 사라지는 문제를 프로필 화면에 한정한 스타일로 수정했다. 독립검증자가 재실행·재촬영하여 filled 주동작을 확인했다. root 최종 typecheck exit0, 모바일 완료 스크린샷 확인. 인증 증거 .local/wb85-profile-auth-review.cjs. 테스트 환경 첫 pytest는 Windows sandbox의 AnyIO socketpair에서 정체되어 종료 후 같은 임시DB 테스트를 승인된 실행으로 재수행했다. 제품 테스트 실패로 숨기거나 통과 처리하지 않았다.

최종 API 회귀: 구현자 test_factory_profile.py / test_factory.py / test_factory_progress.py 합계54/54 통과(exit0,160.97초). basetemp=.local/pytest-profile-api-verified. 신규18와 기존36을 포함한다. 독립 API18/브라우저 검증 및 root 통합 타입/보드 검사로 완료 판정.

## 저장 후 직접 복귀 후속
사용자 지시로 프로필 SaveResult 단계를 제거했다. 서버 확정 응답 검증 후 /factory replace로 이동하며 일회성 메모리 알림을 목적지에 제공하고 포커스한다. 개인 정보/비밀번호를 알림 저장소에 넣지 않는다. 실패·불확실 결과는 기존 화면에 남기며 중복 제출을 막는다. 홈 제목을 대시보드로 변경했다. API/권한 변경 없음. root 구현, factory_verify 독립검증. ESLint effect 동기 상태갱신 지적을 받아 도착 프레임 callback에서 소비하고 StrictMode cleanup시 취소하도록 변경, 대상lint exit0. 첫 lint 재실행 경로 오류는 앱 폴더에서 재실행해 해결.

후속 최종: root typecheck/대상lint exit0. 독립 브라우저 exit0: 성공 자동 /factory 복귀·대시보드 제목·서버 확정 이름 헤더 갱신·알림 포커스/닫기, 닫은 후와 닫지 않은 상태 모두 새로고침/재방문 알림 비반복. 422/429/409/503 실패 edit URL 유지·이름보존·비밀번호제거·차단/조회 유지. 390 dark 실제24px 이미지 직접검수. 근거 .local/wb85-profile-auto-return-review.cjs/json, wb85-profile-auto-return-390-dark.png. PUT은 모킹이며 API 변경 없어 기존54/독립18 회귀를 재실행하지 않았다.

탐색 중복 후속: 일반 목록/상세 공통 헤더 대시보드로 제거, 프로필 편집의 취소 라벨 축약. root typecheck/대상lint exit0. 독립 브라우저 exit0: products 및 production-requests 헤더 링크없음, 사이드바 대시보드→/factory, profile/edit 취소→/factory 정상. 읽기 전용 검증, 쓰기 없음. 근거 .local/wb85-header-cleanup-review.cjs. 디자인 시스템 중복 탐색 기준 반영.
