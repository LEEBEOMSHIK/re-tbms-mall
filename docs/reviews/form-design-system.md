# 공통 폼 디자인 검증

2026-10-26 / WB18 / R18
계획: docs/superpowers/plans/2026-10-26-form-design-system.md

inventory_ui는 components/ui/form-controls.tsx·form-controls.css를 추가하고 catalog 폼/카테고리 화면/스타일의 기존 중복 규칙을 정리했다. 조정 담당은 디자인 시스템 v0.2·개발 절차·보드와 브라우저 통합을 담당했다. inventory_review는 독립 검토했다.

모든 catalog 폼에 ds-form을 적용해 input/select/textarea의12px 모서리와52px 최소높이를 공유한다. readonly/disabled/focus/aria-invalid 상태를 분리한다. FormChoice는 native checkbox와 label을 유지하면서 선택 카드로 표시하며 빈 사각 체크박스를 반복하지 않는다. 선택 시 밝은 배경·강조 테두리·체크 원을 표시한다. 장식용 영문 문구는 aria-hidden이다.

독립 웹 테스트33개, lint·typecheck·build 성공. 검토 중 기본 입력 selector 우선순위가 상태를 막거나 반대로 기존 global CSS보다 약한 충돌, 오류 상태를 hover가 덮는 문제를 발견해 수정했다. 기존 catalog의 선택 컨트롤 덮어쓰기 규칙을 제거했다.

Edge 실제 로컬 화면에서 text/select/textarea/readonly의 계산된12px radius와52px 이상 높이, readonly 배경, 체크 원의 선택 전 숨김/선택 후 표시, label 클릭/Space/포커스/ALL 배타를 확인했다. 320/390/1440px 넘침 없음, 모바일 캡처 시각 검토. reduced-motion 에뮬레이션에서 transition0s, forced-colors에서 select native복귀/선택 체크 유지 확인. 카테고리 수정의 readonly 코드/disabled 부모select/사용 여부 체크를 검증했다. 데이터 저장은 하지 않았다.

초기 브라우저 스크립트의 getByLabel 정확 텍스트 매칭이 장식용 영문을 포함해 실패했다. 실제 보조기기 접근성 이름을 사용하는 checkbox role/name 조회로 보정하고 전체 재실행 통과했다. 한국어 accessible name과 키보드 접근을 확인했으며 전체 스크린리더 인증을 주장하지 않는다.

docs/design-system.md에 코드 위치·토큰·적용법·실제 적용 범위를 기록하고 docs/development-process.md에 UI 피드백을 공통 구현과 소비 화면 검증까지 반영하는 절차를 추가했다. 로그인/진열/고객 화면 전체 재적용은 이번 범위 밖이다. API/DB와 계절 정규화 규칙은 미변경이므로 API 테스트를 반복하지 않았다. 복구는 이번 UI/문서만 되돌린다. 커밋·푸시·배포 없음.
