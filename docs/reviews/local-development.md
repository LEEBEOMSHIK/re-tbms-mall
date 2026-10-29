# 로컬 개발 기반 검증 기록

날짜: 2026-10-25 / 작업 브랜치: feat/local-development-foundation
계획: [로컬 기반 구현 계획](../superpowers/plans/2026-10-25-local-development.md)

## 역할과 작업 범위

- backend_foundation: services/api. FastAPI·설정·헬스 API·CORS·의존성·테스트.
- frontend_foundation: apps/web. Next.js·디자인 토큰·반응형 시작 화면·상태 조회·테스트.
- 조정 담당: scripts·ignore·문서, 실제 설치·HTTP·브라우저 통합 검증.
- foundation_review: 독립 코드/문서 검토, API 및 웹 테스트·린트·타입 검사, 스크립트 안전성 검증. 구현 파일 수정 없음.

## 실행 환경과 결과

Windows ARM64, Node.js 24.18.0/npm 11.16.0, Python 3.11.9.
Next.js 16.4.3/React 19.3.1, FastAPI 0.162.0/Uvicorn 0.54.0. 상세 직접·전이 의존성은 package-lock.json과 requirements 파일에 고정.

| 검증 | 결과 |
|---|---|
| API 테스트 | 테스트 선작성: 초기 7 실패·1 통과 → 구현/추가 후 최종 10 통과. 독립 및 통합 담당 재실행도 10 통과 |
| 웹 상태 조회 테스트 | 초기 5 실패 → 구현 후 5 통과, 독립·재설치 후에도 5 통과 |
| 웹 lint·typecheck | 구현자·독립 검증자·통합 담당 실행 성공 |
| 웹 프로덕션 빌드 | 구현자 성공, 재설치 후 통합 담당 npm run build 성공 (정적 페이지 3개 생성) |
| Windows PowerShell 설치 스크립트 | setup.ps1 실제 성공, pip 고정 의존성 + npm ci. npm audit 0 vulnerabilities |
| Python 의존성 | pip check: No broken requirements found |
| 포트 검사 | 점유 포트 거절, 원 프로세스 유지, 해제 포트 허용 |
| 환경파일 | 기존 파일 미덮어쓰기·누락 파일 초기 복사 검증 |
| 실제 API HTTP | 8100 health JSON·허용/거부 CORS·OpenAPI 모두 통과 |
| 실제 브라우저 | Edge headless에서 연결·재시도·네트워크 실패 모의·재연결 성공, pageerror 없음 |
| 화면 확인 | 390px·1440px 스크린샷 확인, 320/390/1440px 가로 넘침 없음 |
| Git 제외 | .env·.env.local·venv·node_modules·.next·로컬 검증 이미지 제외, .env.example 포함 가능 |
| 문서 | 상대 링크 검증, 신규 헬스 API 계약 반영 |

## 발견·수정

1. Windows PowerShell이 Node 버전 검사 JS 문자열의 내부 따옴표를 제거하는 문제: 따옴표가 필요 없는 process.versions.node 표현식과 PowerShell 버전 비교로 수정. 독립 재현·수정 검증 완료.
2. 기존 사용자 프로그램이 3000/8000 포트 점유: 해당 프로세스를 종료하지 않고 프로젝트 기본 포트를 3100/8100으로 변경. 웹/API/환경 예제/테스트/문서 일치 확인.
3. 신규 API 경로와 과거 문서-only 상태를 문서에 반영.

## 남은 제한

- 이 결과는 기반 프로젝트 검증이며 상품·재고 업무·인증·DB·시안 편집·결제·AI 검증이 아니다.
- 전체 WCAG 준수·스크린리더·운영 성능·백업·운영 Docker 이미지는 아직 검증하지 않았다.
- 설치 시 ESLint 9.39.5 지원 종료 경고와 unrs-resolver 설치 스크립트 승인 미설정 경고가 발생한다. 현재 Next ESLint 플러그인과의 peer 호환성을 위해 버전을 고정했으며 테스트·lint·build는 정상 동작했다. 후속 의존성 갱신에서 지원 버전 조합과 필요한 설치 스크립트를 검토한다. 이번 작업은 승인되지 않은 패키지 설치 스크립트를 일괄 허용하지 않았다.
- Next dev가 apps/web/AGENTS.md를 생성했다. 프레임워크 로컬 가이드 참조 지침이며 루트 프로젝트 지침과 함께 유지한다.
- 신규 변경은 커밋·푸시하지 않았다.

## 재현·종료

README의 setup·dev-api·dev-web 명령을 사용한다. 웹 127.0.0.1:3100, API 127.0.0.1:8100. 각 터미널 Ctrl+C로 자신이 실행한 서버를 종료한다. 에이전트 통합 검증에서 시작한 두 개발 서버는 결과 확인을 위해 실행 중으로 둔다.
