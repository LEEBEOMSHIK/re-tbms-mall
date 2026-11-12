# WB236 로컬 Python x64 표준화 검증

- 날짜: 2026-11-13
- 요구/목적: 사용자 요청, 로컬 ARM64 확장 보안 차단 및 실패 reloader의 포트 점유 재발 방지.
- 담당: root 구현·통합 확인, commit_review 독립 소스 및 PowerShell 5.1 CheckOnly 검증.
- 범위: scripts/setup.ps1, setup-api.ps1, dev-api.ps1, python-runtime.ps1, requirements.txt 주석, README, 환경·결정·캐시 정책 및 작업 보드.
- 계약: Python 3.11 x64 / services/api/.venv. DB·환경설정·기존 의존성 버전 유지. 운영·보안 정책 변경 없음.
- 의존성: 설치된 Python 3.11 x64, 패키지 다운로드 연결. 새 패키지 추가 없음.

## 실행 결과

1. 기존 ARM64 환경을 임시 보존 후 canonical .venv를 Python 3.11.9 AMD64로 생성. requirements-dev.txt를 공식 binary wheel로 설치 성공.
2. setup-api.ps1 재실행 성공. 기존 설정 덮어쓰기 없음. 전체 setup.ps1은 API 설치에 같은 스크립트를 사용하도록 정리했으며 npm ci는 이번 API 작업에서 재실행하지 않음.
3. PowerShell 7 및 Windows PowerShell 5.1 CheckOnly 성공. 초기 PS5.1 Python -c 따옴표 손실을 발견하여 수정 후 재검증.
4. ARM64 인터프리터 검사 거부 확인. 버전·아키텍처와 native import/pip 검사는 포트 검사 및 reloader 시작보다 먼저 수행.
5. 이전 임시 x64 서버만 종료한 후 새 dev-api.ps1로 시작. API health/storefront 및 웹3100 /api/shop/storefront HTTP200.
6. 실행 중 중복 시작은 포트 충돌로 종료 코드1, 기존 서버 HTTP200 유지. 자동 프로세스 종료나 포트 변경 없음.
7. services/api에서 pytest tests/test_health.py tests/test_storefront.py -q: **46 passed (12.49s)**. 샌드박스 실행은 진행되지 않아 중단하고 권한 승인 환경에서 재실행한 결과다.
8. commit_review 독립 검토: 소스 차단 사항 없음, PowerShell 5.1 CheckOnly 종료0, native imports/pip check 통과. HTTP·삭제는 root 통합 확인.
9. Smart App Control VerifiedAndReputablePolicyState=1 유지.

## 보존 및 정리

기존 DB와 API/web 환경설정 총20개 파일은 설치 전후 및 정리 후 SHA256 동일. 업로드·이미지·기존 검증자료는 삭제하지 않았다.

명시적 정리 요청에 따라 교체 후 미사용 상태를 확인한 다음 경로만 정리했다.

- services/api/.venv-arm64-retired: 기존 ARM64 패키지 환경
- .local/api-venv-x64: 긴급 복구에 사용한 중복 x64 환경
- .local/package-repair: ARM64 진단용 다운로드 wheel 2개

총6,373파일, 논리 크기127,726,226바이트. 프로세스 사용 여부·workspace 경계·reparse point 검사, 파일별 SHA256 재검증 후 개별 파일 삭제 및 빈 디렉터리 제거. 실제 디스크 여유 공간 변화는 측정하지 않음. Git 제외 .local/wb236-cleanup-manifest.json 및 runtime-preserve-before.json에 경로·해시 근거 보존. 세 대상 부재와 canonical 서버 응답 재확인.

복구: 설정과 DB는 기존 위치에 남아 있다. 가상환경 재구성이 필요하면 서버를 Ctrl+C로 종료하고 환경을 점검한 후 setup-api.ps1로 동일 잠금 패키지를 재설치한다. 설치 스크립트는 기존 환경을 자동 삭제하지 않는다. 폐기한 ARM64 환경으로 돌아갈 필요는 없으며 보안 예외를 추가하지 않는다.

가이드 영향 없음: 관리자 업무 화면/클릭 절차는 변경하지 않고 개발자 실행 절차만 변경했다. UI 변경 없으므로 이 작업의 화면 캡처 대상 없음. 별도 WB235의 모바일 여백 검증은 본 작업 완료에 포함하지 않는다.
