# 별도 작업 공간 준비 및 검증 (WB80)

- 요구 근거: 2026-10-27 사용자 지시 — 현재 변경 보존, 별도 worktree 준비, 통합 후 불필요 worktree/파일 정리 및 내부 지침 반영. 제품 요구/API 변경 없음.
- 목적/범위: 원본 보존과 새 작업 공간 준비, 통합·복구·정리 절차. 추가 기능 구현/배포/기존 파일 삭제는 제외.
- 담당: 조정 담당 준비·문서 / 별도 검증자 확인.
- 수정 파일: AGENTS.md, docs/development-process.md, docs/decisions.md, docs/reviews/worktree-isolation.md, workboard.md. 공유 문서는 조정 담당 소유.
- 선행 조건: 기존 WB79 변경 보존, 파일 소유권 분리. 새 기능 범위는 후속 사용자 요청으로 결정.
- 계약: 원본 HEAD/인덱스/앱 소스 불변, 로컬 전용 스냅샷, 비밀·DB·캐시 제외. 쓰기 UX/목록 분리 검증은 앱 변경이 없으므로 해당 없음.
- 수용 기준: 기준 소스 일치·원본 인덱스 보존·관리형 worktree 등록·작업 브랜치 확보·보드/문서 정합성·독립 검증.
- 검증 방법: Git 상태와 파일 해시 비교, worktree 목록, 웹 단위 테스트, 문서 참조와 보드 테스트. 앱 실행/통합 기능 검증과 구분한다.
- 복구: 원본 작업 폴더는 그대로 유지한다. 스냅샷 ref에서 기준 소스를 복구하며, 통합 후 archive_worktree로 정리한 공간은 앱 restore_worktree로 복구한다. ignored 고유 파일은 archive 전에 별도 보존해야 한다.
- 통합/정리: docs/development-process.md의 별도 worktree 절차를 따른다. 아직 추가 기능 통합이나 worktree 폐기는 수행하지 않는다.

## 실행 증거

- 원본: `C:/projects/re-tbms-mall`, 브랜치 `feat/local-development-foundation`, HEAD `089f4dc`. 기존 인덱스 바이트 해시와 HEAD 보존을 자체/독립 검증했다. 기존 앱 파일을 수정하거나 삭제하지 않았다.
- 기준: `a1f83a5350da6412f263b2f93681a7cf714e558c`, 로컬 ref `codex/parallel-baseline-20261027`. 별도 임시 인덱스로 417개 추적/선별 미추적 소스를 담았으며 원본 branch는 이동하지 않았다. 임시 인덱스는 제거했다.
- 새 공간: `C:/Users/bumci/.codex/worktrees/parallel-work/re-tbms-mall`, 작업 브랜치 `codex/parallel-work-20261027`. 앱 관리형 attachment 등록 확인, 독립 Git status clean·diff --check 통과.
- 소스 보존 비교용 로컬 해시 manifest: 원본 `.local/wb80-baseline.json`. 소스/비밀 내용과 작업 상태를 저장하지 않는 검증용 해시 목록이다. 통합 후 증거 필요성을 판단해 이 작업의 임시 파일로 정리한다.
- `.local`, 실제 `.env`, DB, node_modules, .venv는 새 공간에 복사하지 않았다. 새 기능 구현 시 자체 의존성·설정·별도 포트와 DB를 구성해야 한다. 아직 서버 기동/런타임 준비 완료를 의미하지 않는다.
- 새 공간 `node --test apps/web/tests/*.test.ts`: 80/80 통과. 원본 `node --test apps/web/tests/workboard.test.ts`: 5/5 통과. 독립 검증자도 새 공간 보드 테스트 5/5를 실행했다.
- 독립 검증 역할 `verify_worktree`: HEAD/index, 417개 파일 경로, clean 상태, 실행 데이터 제외, 통합·정리·복구 규칙 확인. 차단 이슈 없음.
- 통합 확인: `git ls-tree`와 `git hash-object --stdin-paths`로 새 공간 417개 파일의 Git blob이 기준 스냅샷과 모두 일치함을 확인했다. 원본 HEAD/index를 재검해 불변을 확인했다. 스냅샷 이후 원본의 다른 작업 변경은 자동 동기화하지 않으며 그대로 보존한다. 초기 개별 Git 호출 방식 비교는 중단하고 동일 검증을 배치 실행으로 완료했다.
- 원본 상태 보드는 `C:/projects/re-tbms-mall/workboard.md`이다. 새 공간의 보드는 기준 시점 사본으로 별도 상태 관리하지 않는다. WB79는 다른 작업이므로 기존 변경과 상태를 보존한다. 이 보고서의 최종 실행 근거는 원본에서 갱신한다.
- 미실행: 의존성 설치·FastAPI 전체 테스트·빌드·브라우저·서버 실행. 이번 범위는 기능 구현이 아닌 소스 격리 준비이므로 이를 앱 통합 성공으로 해석하지 않는다. 새로운 기능 범위 지정 후 필요한 검증을 별도로 수행한다.
- 실제 정리: 이번 스냅샷의 임시 인덱스만 제거. 원본 소스·자산·DB 삭제, worktree 폐기, 브랜치 삭제, push/배포는 하지 않았다. 추가 작업 통합 뒤 `docs/development-process.md` 절차에 따라 archive 및 선별 정리를 수행한다.
