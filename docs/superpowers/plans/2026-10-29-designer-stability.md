# WB83 시안 편집기 안정성 검증

**Goal:** R19–R20 / Q02의 WebGL 복구·동시 편집 보존·성능을 현재 관리자 통합본에서 검증하고 재현된 결함 수정.
**Architecture:** 기존 schema1 미리보기와 schema2 iframe 스튜디오의 저장 계약 유지. 서버 버전/사본 API 재사용, 실제 업무 데이터 대신 합성 브라우저 응답 및 임시DB 테스트.
**Tech Stack:** Next.js/React, Three.js, FastAPI, Playwright/Edge.
**Spec:** docs/superpowers/specs/2026-10-27-garment-designer-design.md 및 docs/reviews/studio-integration.md.

## 범위·담당·계약
- root: 검증, 필요한 렌더러/편집 UI 수정, 회귀 테스트, 문서와 workboard. 별도 검증자는 최종 diff와 실제 재현을 읽기 전용 검토.
- 수정 후보: apps/web/public/garment-studio/app.js와 복구 모듈/HTML, features/garment-designer의 해당 오류 경로, tests의 안정성 회귀. 서버 결함 발견 시 소유 파일·계약을 기록한 뒤 수정.
- 기존 WB88/95~99와 next-env.d.ts 미커밋 변경 보존. 기존 프로세스/실DB/운영 설정 변경 없음. 신규 의존성 없음.
- 원본 덮어쓰기 금지, 409에서 로컬 초안 유지와 사본 저장. WebGL 실패는 저장 실패로 표시하지 않음. 화면 구조·SaveResult 규칙 유지.

## 검증 순서 및 수용 기준
- [x] 실제 context loss 강제: 오류 안내, 초안 유지, 페이지 이탈 없이 재시도/복원, 이후 수정·저장 가능. 반복 손실도 확인. schema1/2 적용 범위를 기록.
- [x] 두 탭 같은 버전: A 저장 후 B 409, B 초안 사본 저장, A 원본과 B 사본 모두 보존. API 임시DB 회귀와 브라우저를 구분.
- [x] 기기/브라우저/viewport 기록, 초기 로딩, 편집 반영 지연, 자동 회전 FPS 측정. 기존 목표 편집200ms/회전30fps, 일반 및 복잡한 시안 결과를 숨기지 않음. 측정상 한계와 병목 기록.
- [x] 결함은 실패 재현을 먼저 남기고 최소 수정 후 동일 시나리오 재실행. 관련 웹/API 테스트·타입·lint 수행.
- [x] 독립 검증 후 docs/reviews/designer-stability.md 및 workboard 갱신. 미실행/미달은 완료로 숨기지 않음.

## Review Focus
연결 손실 중 입력/저장, 연속 손실과 복구 버튼 중복, 캐시된 GPU 자원 복원, 충돌 사본 자산 참조, 고부하 시 측정 왜곡을 확인한다. 실제 물성·제작치수 인증은 범위 밖이다.

실행 결과: docs/reviews/designer-stability.md. 독립 검증 완료, 실제 물성/전체기기 성능 인증은 제외.
