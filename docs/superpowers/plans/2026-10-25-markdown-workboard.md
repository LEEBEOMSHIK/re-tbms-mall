# Markdown 작업 보드 연결 계획

목적: 사용자가 직접 관리 가능한 루트 workboard.md를 단일 원본으로 삼고 기존 /admin/workboard에서 카드와 원문을 제공한다.
요구: R28. 기존 작업 9개의 상태/담당/우선순위/완료 기준/선행 조건/검증 결과 보존.

구현 선택: 고정 경로의 Markdown을 서버 요청마다 읽는다. 보드 표시를 위한 최소 형식만 검증하고 별도 JSON 복사본은 두지 않는다. 원문은 안전한 텍스트로 표시하며 HTML을 실행하지 않는다. 누락/형식 오류는 명시적으로 표시한다. 원문 URL /admin/workboard/source는 UTF-8 text/plain·no-store다.

담당 및 파일:
- markdown_board: workboard.md, 웹 parser/loader/page/source route/styles/test. 구현 및 자체 검증.
- 조정: AGENTS.md, README, docs/workboard.md 및 개발 절차/결정/요구 기록. 실제 브라우저 및 원문 동일성·변경 반영 확인.
- markdown_board_review: 독립 소스 검토 및 테스트/lint/typecheck. 소스 수정 없음.

수용 기준:
- [x] 기존 9개 작업 데이터 보존 및 JSON 단일 원본 해제
- [x] Markdown 보드와 원문을 동일 URL에서 확인하고 원문 전용 URL 제공
- [x] 문서 저장 후 새 요청/새로고침에 반영, 생성 복사본 동기화 불필요
- [x] 중복 ID·누락 필드·잘못된 상태 거절 및 사용자용 오류 표시
- [x] 작업 시작/검증/완료 단계 문서 갱신 규칙과 근거 연결
- [x] 단위 검증·독립 검토·빌드·로컬 브라우저 확인

로컬 내부 사용 범위는 유지하며 고객 메뉴에 연결하지 않는다. 운영 공개 접근 제어와 문서 파일 배포는 별도 범위다. 새 의존성과 Docker 구성 없음.
