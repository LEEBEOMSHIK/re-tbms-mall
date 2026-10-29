# 관리자 선택 컨트롤 스타일

2026-10-26 / WB17 / R18

사용자 요청: 콤보박스·체크박스 UI를 세련되게 개선한다. 기존 흑백 토큰을 유지하고 드롭다운에 52px 높이·12px 모서리·화살표·hover/focus 스타일을 적용한다. 계절은 체크 표시를 가진 버튼형 칩으로 표시한다. 넓은 화면은 5열, 모바일은 2열과 사계절 전체 너비다. 같은 catalog CSS를 사용하는 옵션/재고/카테고리 화면에도 일관되게 적용한다.

수정 파일: apps/web/src/app/admin/(protected)/catalog/catalog.css, 디자인 문서·보드·검증 기록. API·DOM 의미·저장 규칙은 변경하지 않는다. native select/checkbox와 label/fieldset/legend를 유지한다. OS가 그리는 드롭다운 펼침 목록은 기본 동작을 유지한다. focus-visible, disabled, forced-colors, reduced-motion에 대응한다.

조정 담당이 CSS 구현과 실제 PC/모바일 시각·키보드 검증을 하고 inventory_review가 별도 소스/검증 결과를 검토한다. 수용 기준은 읽기 쉬운 선택 상태와 체크 표시, 키보드 Space 토글/포커스, 종속 분류·사계절 동작 유지, 320/390/1440px 넘침 없음이다. 단순 스타일 변경이므로 불변식 신규 테스트·DB 테스트는 추가하지 않는다. 복구는 해당 CSS와 문서 변경만 되돌리며 데이터 변경 없음.
