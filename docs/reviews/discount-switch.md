# WB214 / R107 할인 설정 헤더·스위치
- 승인: 제목/설명 왼쪽, 스위치 오른쪽. 켜면 입력/미리보기 표시, 모바일에도 제목·스위치 같은 행.
- 담당 root 구현 / 별도 독립 검증. 범위 publication-editor/catalog.css, 공통 FormSwitch/form-controls.css, 디자인 예시·가이드·보드.
- 계약: native checkbox role=switch, 접근 가능한 이름/설명·키보드·disabled 제공. 기존 할인 enabled 상태와 계산/저장 유지.
- 수용: PC1440/390/320 라이트·다크, Space/클릭·입력 보존·넘침 없음. catalog:3 캡처·표식 교체.
- 복구: 이번 UI/문서 변경만 복원, 이전 변경 보존. 실제 가격 쓰기 없음.

## 검증 결과 (2026-11-06)
- PC1440/390/320 실제 Chrome에서 제목/설명과 스위치 배치, 클릭·Space 토글·20%/24000원 입력 보존·넘침 없음 확인.
- hold_ui 독립 동일3폭 확인. 키보드 focus outline2px, fieldset disabled 합성검사로 native 변경 차단/해제후복구 통과. 실제 쓰기 없음.
- 타입·수정파일lint·가이드/보드9 통과. catalog:3/design-system:0 캡처·표식 재생성과 시각 확인, catalog 원문 동기화.
- 증거 .local/wb214-off-1440.png, .local/wb214-on-320.png, .local/wb214-guide.png, .local/wb214-independent.cjs.
- 완료. API/저장 변경 없어 서버회귀 재실행하지 않음. 다음은 사용자 요청에 따름.
