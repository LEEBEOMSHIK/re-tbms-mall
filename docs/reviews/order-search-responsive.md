# WB148 모바일 검색 스타일 및 PC 화면 복원 확인

- R111 / root 구현, customer_account_review 독립 CSS 검토 / 2026-11-01.
- 사용자 현상: PC에서 좁은 화면 배치, 모바일 전체 검색 줄바꿈/높이 불일치.
- 원인 근거: 이전 WB147 검증 viewport 복원 직후 256/433px 관측, 이번 작업 시작 실제 Chrome1600px 정상. 첨부의 두줄 레이아웃은 max-width639 규칙과 일치하므로 검증용 너비가 잠시 유지됐던 가능성이 높다. 원인 확정으로 과장하지 않는다. 이번에는 사용자 Chrome 너비를 바꾸지 않고 별도 IAB 탭에서 모바일 검증.
- CSS 원인: 공통 ds-form의52px/상속 폰트가 검색 전용 스타일보다 우선하여 선택상자/아이콘과 버튼 높이가 달랐다. 검색 범위에만44px 토큰·명시적 제어 높이 적용. 모바일 입력16px, 선택문구 nowrap 및136px 공간 확보. 390px는 선택/버튼 첫줄·검색어 다음줄, 359px 미만3줄.
- 실제 검증: Chrome1600px PC한줄, input44px 확인. 별도IAB390px select44px·input44px/font16px, 전체검색 한줄·버튼 배치 및 전체 캡처 시각 확인. 320px 가로넘침false/select44px. 테스트 후 IAB viewport reset, 사용자 Chrome1600px 재확인.
- 가이드 sales-orders 캡처 갱신, 실제 인증 가이드 확대화면 로드·아이콘/검색 표식 시각 확인. WB146/147에서 남은 모바일·가이드 렌더 확인을 이 작업으로 보완.
- 캡처: `.local/wb148-pc.png`, `.local/wb148-mobile-full.png`, `.local/wb148-expanded.png`, `.local/wb148-guide.png`. viewport-only 모바일 캡처는 도구 출력 배율이 축소되어 fullPage 캡처를 검증 근거로 사용.
- 독립 CSS 검토 차단 이슈 없음. API/DB 변경 없음, 저장 UX 해당 없음. 복구는 검색 CSS 범위 변경 되돌림. 부분날짜 native invalid 경계는 WB146의 코드검토 근거 유지(직접재현 미실행).
