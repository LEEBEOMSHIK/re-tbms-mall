# WB116 / R110 캡처 크기 수정
목적: 세로 캡처의 본문폭 강제확대로 발생하는 과대 표시와 탐색 표식 오차 수정.
담당 root, 독립 검증자. 계약: manifest 원본 width/height 추가; 원본 이미지 파일 불변. 수정: manifest, guide-capture, guide.css, 디자인 시스템, 테스트, 보드.
원인: 350×850 캡처에도 width100%가 적용되어 확대됨. 메뉴 설정 좌표 x156은 원본 이미지 실제 x171과 차이가 있음. 원본 raster에 맞춰 표식 재보정.
수용: 미리보기 원본 이하/높이520px 이하/가용폭 이하, 종횡비 보존, 표식과 이미지 동일 스케일. 확대 원본 스크롤 유지.
검증: 진행 중. DB/API 변경 없음. 가이드 영향 start:1 및 전체 캡처 렌더링. 복구는 이 작업 CSS/치수/좌표 수정만 되돌림.

## 독립 검토 — guide_review / 2026-10-30

- 현재 guide-capture.tsx, guide.css, manifest, 기존 캡처 테스트를 검토했다. 원본 width/height HTML 속성과 height:auto는 종횡비를 유지한다. 미리보기 너비 `min(원본 너비, 520 × 원본 너비 / 원본 높이)`와 `max-width:100%` 조합은 원본 이상으로 키우지 않고 이미지 높이를 520px 이하로 제한한다. 확대 dialog는 별도 width:auto 규칙으로 원본 크기 스크롤을 유지한다.
- System.Drawing으로 JPEG 18개의 실제 치수를 읽어 manifest 19개 연결의 width/height와 대조했다. 모두 일치한다. 내비게이션은 350×850이며 미리보기 계산 너비는 약214.12px이다(테두리 내부 이미지는 조금 더 작음).
- navigation.jpg를 view_image로 다시 열어 설정 버튼의 실제 영역 x171–215 / y113–157을 확인했다. 수정된 settings 표식이 이를 가리킨다. 운영과 상품관리 표식의 우측223px도 실제 sidebar 영역과 일치한다. WB115의 이전 육안검토에서 놓친 settings 15px 오차를 이번에는 실제 raster 좌표 기준으로 재확인했다.
- `node --test apps/web/tests/admin-guide.test.ts apps/web/tests/admin-guide-captures.test.ts`: 4개 통과, 0개 실패(672ms). 이 실행 시 기존 테스트는 새 원본 치수를 검사하지 않았으며, JPEG 실제 치수 일치 테스트를 root에 권고했다.
- 독립 코드·자산 판정: 차단 결함 없음, 통합 검증 가능. 실제 모바일/데스크톱/확대 크기와 표식 렌더링은 root의 브라우저 검증으로 추가한다. 이 검토자는 실제 브라우저를 조작하지 않았다.
- `apps/web`에서 guide-capture.tsx 및 admin-guide-captures.ts 대상 ESLint 실행: exit 0.

통합 검증: 실제 localhost3100의 다크 테마에서 navigation 미리보기 212.117×515.141px, 원본350×850 비율 일치. 확대 및 Escape 닫기 확인. 모바일390px에서 pageWidth375이며 미리보기 동일비율/높이 유지. 새 JPEG SOF 파서로 실제 파일 치수와 manifest 일치를 자동검증하며 최종 가이드·보드9테스트 통과. typecheck 통과. 브라우저 override 해제·검증 탭 종료, 사용자 설정 불변. 화면 증거 .local/wb116-guide-sizing.jpg. 원본 캡처는 그대로 두고 표식과 렌더링을 수정함.
