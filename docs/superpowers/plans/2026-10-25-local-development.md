# Local development foundation implementation plan

> For agentic workers: execute through separated implementation and independent review roles. User authorized implementation from the existing design on 2026-10-25.

Goal: Docker 없이 Windows에서 Next.js와 FastAPI 기본 서비스를 설치·실행·검증한다.
Architecture: apps/web의 Next.js App Router + services/api의 FastAPI, localhost HTTP 연결. DB·결제·상품 업무·시안 편집기·AI는 이번 기반 범위 밖이며 선택하지 않는다.
Tech stack: 로컬 Node.js 24, Python 3.11+, npm lockfile, Python venv/pinned dependencies. 실제 설치 버전은 결과 기록에 남긴다.
Spec: ../../environments.md, ../../architecture.md, ../../api-contract.md, ../../design-system.md.

## Global constraints
- 기존 C:\projects\re-tbms-mall 재사용, feat/local-development-foundation 브랜치. Docker 파일·설치 없음.
- 결제·DB·AI 선택을 임의 확정하지 않는다. 외부 유료 호출 없음.
- API 계약: GET /api/v1/health -> 200 {"status":"ok","service":"re-tbms-mall-api"}; GET /docs OpenAPI UI.
- 웹은 NEXT_PUBLIC_API_BASE_URL(기본 http://127.0.0.1:8100)을 통해 상태 확인. 실패·로딩·재시도 제공.
- API CORS 허용 기본은 http://localhost:3100, http://127.0.0.1:3100. 와일드카드 없음.
- 공유 파일은 조정 담당만 수정. 구현 에이전트는 자기 디렉터리만 수정. 커밋·푸시는 이번 요청 범위에 추가하지 않는다.

## Tasks
- [x] Backend agent: services/api/{app/main.py,app/config.py,tests/test_health.py,pyproject.toml,requirements*.txt,.env.example}. 먼저 헬스·허용/거절 CORS 테스트, 실패 확인, 앱 구현, venv 설치·전체 pytest 실행.
- [x] Frontend agent: apps/web의 Next.js·TypeScript·CSS 토큰·시작 화면·API 연결 상태. 계약 데이터 검증과 연결 실패 테스트를 먼저 작성. npm install, test, lint, typecheck, build. 외부 폰트/이미지 의존 없음.
- [x] Coordinator: .gitignore, scripts/setup.ps1, scripts/dev-api.ps1, scripts/dev-web.ps1, README, 환경/결정 문서 갱신. 별도 터미널 실행으로 종료 소유권 명확화. 선택하지 않은 DB 불필요.
- [x] Independent reviewer: 실제 diff·계약·보안·실행 명령 검토, 구현자와 분리. 조정 담당이 전체 테스트·실제 HTTP·실패 복구 통합 확인.

## Review focus
1. API 미기동/잘못된 응답: 웹이 정상 연결로 표시하지 않고 재시도 제공.
2. 원치 않는 origin: API가 허용 CORS 헤더를 보내지 않음.
3. 포트 충돌: 명시한 포트 실패 시 설명, 다른 프로세스 종료 금지.
4. 기존 .env: 설치 스크립트가 덮어쓰지 않음. 비밀/venv/node_modules 제외.
5. 재설치: lockfile·가상환경으로 설치 재현, 앱 런타임 빌드 검증.

## Ledger
- Ruling: DB는 아직 미정이므로 기반은 stateless health 통합만 구현. 가짜 운영 DB 대체를 피한다.
- Ruling: 현재 checkout 재사용 및 별도 브랜치. 사용자 지정 경로 유지.
- Ruling: 작업 경계가 apps/web와 services/api로 분리되고 계약을 먼저 고정했으므로 두 구현 작업을 병렬 배정한다.

- Ruling: 실제 3000·8000 포트를 다른 사용자 프로그램이 사용 중이므로 프로젝트 기본값을 3100·8100으로 변경. 기존 프로세스 종료 없음.

- Completion: 역할별 구현·독립 검증·통합 HTTP/브라우저 검증 완료. 상세 결과와 제한은 ../../reviews/local-development.md 참조.
