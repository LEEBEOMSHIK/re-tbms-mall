# WB44 공급처 목록 세로 간격

R54. 버튼과 안내·빈 상태가 붙어 보이는 문제. catalog-actions는 내부 수평/줄바꿈 간격만 제공하며 목록 패널은 일반 block이고 문단 기본 margin은 reset되어 있다.

조정 담당이 공급처 목록에 opt-in 공통 catalog-list-stack을 적용한다. 그룹 간 space-4, 빈 상태 padding space-6으로 구분한다. 다른 폼 패널에 전역 margin을 추가하지 않는다. 수정 파일은 supplier-manager.tsx, catalog.css와 디자인/요구/보드 문서. 서버 계약은 변경하지 않는다.

검증: 빈 목록 및 populated 목록에서 버튼→안내→결과의 bounding box gap이 space-4 이상인지 확인. 390/1280px, 확대 폰트 조건에서 넘침 확인. 등록/수정은 기존 fieldset gap 유지. 독립 검증자가 소스·lint·type를 확인한다. 복구는 이번 클래스와 CSS만 제거한다.
