# re-tbms-mall

의류 쇼핑몰과 의류 시안 프로그램의 설계 저장소입니다. 프론트엔드는 **Next.js**, 백엔드는 **Python + FastAPI**로 확정되었습니다. 웹과 모바일 사용을 고려하며 향후 앱·AI 확장을 위한 경계를 설계합니다.

현재 단계는 **문서 구성**입니다. 애플리케이션, 의존성, 테스트 실행 환경은 아직 생성하지 않았습니다. 실제 결제 도입과 PG 업체는 미정입니다.

## 읽는 순서

1. [프로젝트 지침](AGENTS.md)
2. [확정 사항·미정 사항](docs/decisions.md)
3. [요구사항 정의서](docs/requirements.md)
4. [기본설계서](docs/architecture.md)
5. [데이터 모델·상태 규칙](docs/data-model.md)
6. [API 경계](docs/api-contract.md)
7. [디자인 시스템](docs/design-system.md)
8. [에이전트 작업·검증 절차](docs/development-process.md)
9. [검증 계획](docs/test-plan.md)
10. [보안·개인정보·외부 연동](docs/security-integrations.md)
11. [단계별 개발 범위·운영 대응](docs/roadmap-runbooks.md)

작업 시작은 [작업 명세 템플릿](docs/templates/task.md), 인수인계와 독립 검증은 [검증 보고서 템플릿](docs/templates/review.md)을 사용합니다.

## 문서 상태

- 문서 버전: v0.3 / 작성일: 2026-10-25 (Asia/Seoul)
- 대화의 v0.1·v0.2와 후속 확정 사항을 통합한 저장소 초안입니다.
- 문서 작성 승인은 모든 세부 사업 정책이나 구현 제안에 대한 승인을 의미하지 않습니다.
- 방송형 홈쇼핑과 가족 공동통장 업무는 이 프로젝트 범위가 아닙니다.
- 개발 명령은 실행 환경을 선택·검증한 뒤 추가합니다. 아직 존재하지 않는 실행 명령을 사용하지 않습니다.

실행 환경 기준: **로컬은 Docker 없이 직접 실행**, **운영은 Docker 기반 배포**입니다. 상세는 [개발·운영 환경 정책](docs/environments.md)을 따릅니다. 아직 앱 실행 구성이나 운영 이미지는 구현하지 않았습니다.

원격: https://github.com/LEEBEOMSHIK/re-tbms-mall.git

로컬 작업 예정 위치: `C:\projects\re-tbms-mall`
