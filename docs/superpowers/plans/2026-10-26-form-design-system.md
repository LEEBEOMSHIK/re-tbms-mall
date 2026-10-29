# 폼 디자인 시스템 통일

2026-10-26 / WB18 / R18

사용자 지적: select만 라운드 처리되어 input과 불일치하고 체크박스가 여전히 투박하다. 다른 작업에서도 피드백을 적용할 디자인 시스템이 필요하다.

공통 폼 스타일과 선택 컴포넌트로 추출한다. 입력/select/textarea는 동일한12px 모서리·52px 최소높이·간격·포커스·비활성/읽기전용 상태를 사용한다. 계절은 빈 체크박스 사각형을 반복하지 않는 선택 카드로 바꾸고 선택 시 배경·테두리·체크 표시로 구분한다. native checkbox와 label 연결 및 키보드 포커스는 유지한다. 사계절 배타/분류/API 로직은 바꾸지 않는다.

inventory_ui는 apps/web/src/components/ui/form-controls.*와 catalog 스타일/폼을 소유한다. 기존 중복 덮어쓰기 스타일을 제거하고 공통 ds-form 사용 경로를 만든다. 조정 담당은 docs/design-system.md를 최신 기준으로 재작성하고 docs/development-process.md에 피드백→공통규칙→소비화면검증 절차를 추가한다. inventory_review는 독립 코드/테스트/lint/types/build, 조정 담당은 PC/모바일 시각·키보드·상태 검증.

수용 기준: 모든 catalog 폼 입력의 모서리/높이 통일, 재사용 가능한 선택 컴포넌트, 기존 체크/사계절 동작 유지, label/Space/포커스/disabled/readonly/고대비 대응,320/390/1440px 넘침 없음. CSS/컴포넌트 변경이므로 API 테스트는 반복하지 않는다. 기존 디자인 토큰을 사용하며 폼 전용 확장 토큰과 적용법을 문서화한다. 복구는 UI와 문서 변경만 되돌리며 DB 영향 없음.
