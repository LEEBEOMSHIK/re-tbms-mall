# WB93 관리자 의류 스튜디오 통합 검증

- 요구: R19–R20. 사용자 승인: 독립 샘플의 품질을 수용하고 기존 관리자에 병합.
- 대상: C:/projects/re-tbms-mall. 기존 상품·재고·리뷰·가격 변경은 보존.
- 구현: 관리자 /admin/designs 목록 → new → 생성 완료 → edit → 저장 완료 → 상세/목록.
- 신규 schema2: 티셔츠/후드, 남성/여성/유니섹스 S–XL, 원단/기모/리브, 앞뒤 다중 나염, 후드 둘레 좌표. 기존 schema1 편집은 유지.
- 관리자 세션 프록시와 서버 소유권 검증을 사용. 브라우저 Blob은 프로젝트 이미지 API에 업로드하고 UUID만 문서에 저장.
- React가 저장과 버전 충돌을 담당하고 동일 출처 iframe이 검토된 3D 렌더러를 재사용. origin/source/channel 검증. 별도 3112 서버 의존성 없음.
- 샘플 업데이트 안내·브라우저 저장 버튼 제거. 서버 저장 완료 후 새로고침 복원. 미저장 이탈 경고. 자동 서버 저장은 구현하지 않음.

## 실행 검증

- 백엔드 전체 505 통과; 이후 schema2 의류 전환 허용 변경에 디자인 47 통과.
- 웹 전체 159 통과. 렌더러 회귀 파일 7 통과.
- 전체 ESLint 통과, Next 운영 빌드 통과(TypeScript 포함).
- 독립 studio_integration_review: 웹 권한/프록시 8, API 20, 추가 bridge/serializer 2 통과. origin/source 위조 거부, 이미지 복원 실패 보존, 지연 복원 취소, Blob 제외/이미지 UUID/둘레 위치, 초기 변경 감지 검증.
- 독립 검토 지적 수정: 최신본은 iframe 복원 성공 후 확정; 실패/시간 초과 시 기존 입력 유지. 업로드 이미지의 종류 변환은 비활성화하여 숨김 저장에서 이미지 참조가 사라지는 경로 차단.
- 실제 3100 브라우저: 비로그인 디자인 URL은 로그인 이동, 로컬 관리자 로그인, 생성 완료 및 포커스, 후드 앞면 그래픽(둘레100/크기30/회전25)·뒷면 타이포, 기모/주름 없음 저장 v2, 새로고침 복원 확인.
- 실제 PNG 업로드 추가 저장 v3 후 별도 상세에서 이미지까지 다시 표시. 상세는 회전만 가능하며 편집 도구가 없음. 좁은 화면에서도 의류와 회전 버튼 표시 확인.
- 증거: .local/integration-WB93/web-tests.log, renderer-tests.log, web-lint.log, web-build.log, admin-studio.png.
- 합성 검증 디자인: 0784e368-4259-4d73-87b1-d8451341f4c0. 운영 고객 데이터 아님.

## 파일 및 계약

apps/web/src/features/garment-designer, app/admin/(protected)/designs, app/api/admin/designs, lib/design-proxy-core.ts, 관리자 navigation, public/garment-{materials,studio}, 관련 tests와 three 의존성.
services/api/app/designs, app/main.py 등록, tests/test_design*.py.
scripts/garment-assets와 garment-studio에 원본 모델·변환 스크립트/출처 보존.
API/스키마 상세는 docs/superpowers/plans/2026-10-29-studio-integration.md.

## 제한 및 복구/정리

- 실제 원단 물성·생산 치수의 검증은 별도. 목록 썸네일은 기본 의류이며 저장 나염은 상세에서 확인.
- 업로드 나염 숨김은 현재 미지원(이동/크기/회전/삭제 가능). 별도 샘플 IndexedDB 작업은 관리자에 자동 이관하지 않음.
- 독립 샘플과 브라우저 저장 자료는 보존. 3112 샘플은 관리자 실행에 필요하지 않지만 사용자 저장 자료가 남아 있어 삭제하지 않음.
- 분리 worktree의 원본 모델과 고유 문서는 주 저장소로 선별 보존. ignored 디자인 DB(SQLite backup), 과거 DB 백업, 연구 원본, 환경 설정은 .local/integration-WB93/preserved-worktree 에 보존하며 커밋하지 않음.
- archive_worktree 실행 결과: 'The task’s primary checkout cannot be removed.' 현재 채팅 기본 작업 폴더이므로 도구가 보관을 거부. 강제 삭제하지 않았음. 관리자 기능 통합·독립 검증은 완료되었으나 이 worktree 보관 정리는 남아 있음.
- Git 통합 커밋 없음: 기존 대량 미커밋 작업 위에 지정 파일만 선별 통합. 푸시/배포 없음. 의존성과 메뉴 원본은 .local/integration-WB93에 백업. 기존 worktree는 원본 복구 경로로 유지.

## main 통합 및 worktree 재점검
2026-10-29 사용자 요청에 따라 33d5073을 main에 fast-forward 통합. origin/main의 기존 이력이 모두 선행하며 삭제 파일 없음, 작업 브랜치와 main 트리 동일 확인.
독립 main_preservation_review: 공장 worktree 비ignored 파일 모두 주 저장소에 존재. 의류 worktree 고유 항목 중 자산 바이트 보존 .gitattributes를 추가 반영. session-namespace/dev-designer는 분리 실행 전용이므로 현 관리자에는 미적용, 원본 worktree에 보존.
공장 ignored DB·연결 설정·검증 자료는 .local/integration-WB93/preserved-factory-worktree에 별도 보존. 의류 자료는 기존 preserved-worktree 백업 유지.
정리 재시도: parallel-work archive는 현재 채팅 primary checkout 보호로 거부, factory-test-login attach는 다른 채팅 소유로 거부. 두 worktree를 강제 제거하지 않았고 정리는 미완료. 해당 채팅의 작업 폴더 전환/소유 채팅에서 archive 후 정리 가능.
개발 서버가 next-env.d.ts를 .next/dev 경로로 자동 갱신한 로컬 차이는 소스 누락이 아니며 커밋하지 않음.
