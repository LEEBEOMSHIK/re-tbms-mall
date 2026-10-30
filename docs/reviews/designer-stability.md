# WB83 시안 편집기 안정성 검증

- 2026-10-29, R19–R20 / Q02. 구현·통합 root, 독립 stability_review. 계획: docs/superpowers/plans/2026-10-29-designer-stability.md.
- 대상: main의 관리자 schema2 스튜디오, 기존 schema1 호환 편집기. 기존 WB88/95~99 및 next-env.d.ts 변경 보존.
- 실제 업무 DB는 쓰지 않았다. 브라우저는 로컬 Next/Edge + 합성 시안 API 응답, 서버 검증은 pytest 임시DB. 기존 개발 프로세스 중지/재시작·새 의존성·커밋·푸시·배포 없음.

## 발견과 수정

- 기존 app.js는 WebGL 손실 시 새로고침만 안내하고 복구 버튼이 없었다. 실제 WEBGL_lose_context 강제 손실에서 복구 버튼 0개로 실패(.local/wb83-baseline.log). 색상/원단을 바꾸면 정상 상태 문구가 오류 안내를 덮는 경로도 확인.
- public/garment-studio/context-recovery.js에 손실/재시도/복원/실패 상태를 분리했다. 입력·나염 메모리를 보존하며, 연속 클릭을 차단하고 10초 미복원 시 다시 시도할 수 있다. 복원 시 PMREM 환경 조명과 그림자 렌더 타깃을 재생성한다.
- app.js에서 첫 비동기 자산 로딩 전 복구 리스너를 설치하고 드래그 중 손실을 취소한다. 손실 중에도 bridge 상태 전파와 저장은 유지하고 렌더링만 건너뛴다. index.html에 기존 도구 스타일의 복구 버튼 추가. 새로고침으로 초안을 버리는 동작 없음.
- tests/studio-recovery.test.ts: 수정 전 모듈 부재 실패 → 손실 이벤트 취소·드래그 중단·안내 보존·중복 시도 방지·복원·복원 실패 재시도 상태 2건 통과.

## 실행 증거

- 실제 Edge에서 손실→복구→동일 색상/나염 유지→서버 확정 응답 표시, 반복 손실 중 색상 변경→오류 안내 유지→복구 통과. .local/wb83-browser.log.
- 브라우저 A/B에서 같은 버전 시작, 서로 다른 색 초안 → A 저장 → B 409 → B 사본 저장 → 원본과 사본 각각 보존 확인. 브라우저 모킹은 색상 초안/충돌/사본 UI 범위이며 자산 복제는 아래 실제 서버 테스트로 확인.
- services/api에서 `.venv/Scripts/python.exe -m pytest tests/test_designs.py tests/test_design_studio.py tests/test_design_integration.py -q --basetemp=.pytest_cache/wb83-stability`: 48/48 통과. 새 연속 두 탭 회귀는 업로드 자산 복제 UUID/바이트 동일·타 프로젝트 자산 접근 차단·사본 재저장·원본 불변까지 확인.
- apps/web `npm test`: 165/165 통과(.local/wb83-web-tests.log). `npm run typecheck`, `npm run lint` 각각 exit0.
- 화면 확인: .local/wb83-recovered.png에서 복구 후 의류·나염·원단·그림자 표시 확인. 최종 브라우저 pageerror 배열 비어 있음.
- 초기 확장 브라우저의 저장 대기가 충돌 제목까지 일치하는 정규식 때문에 너무 일찍 끝났다. 정확한 저장 완료 제목으로 수정해 두 탭 시나리오 재실행 통과. 제품 결함과 구분.
- 독립 stability_review: 웹 복구/bridge 4개, 임시DB 디자인 API47개 통과. .local/wb83-independent-browser.log 및 wb83-independent-extra.log에서 반복 복구·두탭·모바일390px 복구 버튼 범위/저장 완료 제목 포커스·schema1 실제 손실/3D 재시작/초안/저장 확인. JS 오류 없음. 독립 스크린샷 recovered/mobile/schema1 확인, 차단 이슈 없음.
- 독립 첫 성능 재측정: 티셔츠60.15fps/최대174.8ms, 후드20나염59.54fps/최대168.3ms. root 측정과 모두 목표 안에 있음. 추가 브라우저의 iframe 준비 대기 경합은 실제 내부 준비 상태로 대기 조건을 고친 후 재실행 통과했으며 제품 결함과 구분한다.
- 최종 통합 판정: 요청 범위 완료. git diff --check 통과.

## 성능 측정

Windows Edge/Chromium headless 실제 하드웨어 GPU, ANGLE Qualcomm Adreno X2-45 GPU / D3D11, 논리 코어10, 1440×1000, DPR1. 실행 중인 로컬 개발 빌드. 초기 준비 6,972ms(탐색 시작부터 편집 준비까지, 콜드 캐시 보장 없음).

| 합성 시나리오 | 3초 회전 draw-frame FPS | 색상 편집 8회 최대 |
| --- | ---: | ---: |
| 면 티셔츠·나염1개 | 60.0 | 136.7ms |
| 기모 후드·앞뒤 나염20개 | 59.9 | 174.0ms |

RAF마다 실제 주 canvas drawElements가 발생한 프레임만 집계했다. 색상 input부터 다음 RAF의 GPU finish까지 재어 렌더 명령만 제출한 시간을 성능으로 오인하지 않게 했다. 위 조건에서는 기존 목표 편집200ms 이내/회전30fps 이상을 충족했다. 8회 표본이며 장시간 지속/저사양/모든 모바일 기기 성능을 보장하지 않는다. 실제 화면 제시까지의 정밀 광학 지연은 측정하지 않았다.

## 제한·복구

- 실제 원단 물성/제작치수 인증, 운영 환경 장시간 부하, 모든 GPU 드라이버·메모리 부족 재현은 범위 밖이다. 브라우저가 컨텍스트를 영구 복구하지 못하면 오류 안내와 초안 저장 기능을 유지한다.
- API/DB 계약과 상품·SKU·가격·재고 쓰기는 변경하지 않았다. 이번 복구 모듈 및 app.js/index.html의 변경만 되돌릴 수 있다. 되돌리면 기존 새로고침 안내 동작으로 돌아가므로 미저장 상태에서 페이지를 새로고침하지 않는다.
- 기존 변경과 보존 백업을 삭제하지 않는다. workboard.md가 상태 단일 원본이다.
- 보드 최종 갱신 후 실제 workboard.md 파싱 포함 테스트 5/5 통과.
