# 사이트 설정 구조 검증

2026-10-26 / WB23 / R35
계획: docs/superpowers/plans/2026-10-26-site-settings.md

inventory_ui는 SiteSettingsButton/SettingsSection, SiteSettingsContent, TextSizeSetting을 분리했다. 공통 셸은 children을 받고 글자 크기 저장 키나 옵션에 의존하지 않는다. 고객/관리자/로그인 진입점이 같은 조합을 사용한다. 조정 담당은 확장 설계·디자인 문서·실제 브라우저 검증을, inventory_review는 독립 검토를 담당했다.

Edge 스모크(.local/site-settings-smoke.cjs) exit 0: 사이트 설정 제목과 화면 및 접근성 분류, 초기 옵션 숨김, Tab/ShiftTab 모달 순환, Escape/닫기/바깥 클릭과 포커스 복귀,320/390/1440px 최대 크기 경계, 저장 복원/기본 초기화, 고객·관리자·로그인 진입을 확인했다. 390px 캡처에서 사이트 설정→화면 및 접근성→글자 크기 계층을 직접 시각 검토했다. 서버 데이터 쓰기는 없다.

docs/site-settings.md에 현재 구현과 후보, 브라우저/계정/운영 저장·권한 경계 및 설정 추가 절차를 기록했다. 테마·동작 효과·알림·언어·개인정보는 후보이며 구현이나 운영 정책 확정이 아니다. 복구는 이번 UI/문서 변경을 되돌리며 기존 글자 크기 저장값과 서버 데이터는 유지한다.

독립 검토에서 소스·웹 테스트33개·lint·타입 검사가 통과했다. 작업 보드 파서5개도 통과했다. 프로덕션 빌드는 이번 변경에서 재실행하지 않았다. WB23 완료로 기록했고 설정 후보는 별도 승인 전 작업으로 착수하지 않는다.
