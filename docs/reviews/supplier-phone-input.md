# WB50 / R60 전화 입력 검증 기록

- 원인: 기존 코드는 초과 입력을 상태에 반영한 뒤 오류만 표시했다. 저장검증만으로 입력제한 완료를 선언한 UX 누락을 수정했다.
- 변경: apps/web/src/lib/supplier-form.ts, supplier-manager.tsx, tests/supplier-form.test.ts. 입력시 초과·문자규칙 거절, 이전값 보존, 미해결 거절 저장차단, 명시적 기존값확인, 점진적 기존번호교정.
- 웹 테스트66개 통과. 구현 lint/type exit0. 독립 웹66개·lint(경고0)·type 모두 exit0. 차단결함 없음.
- Edge .local/supplier-phone-input-browser.cjs: 양쪽 입력란 12번째 실제키입력 거절, 긴 텍스트 insertText 일괄 교체 거절·이전값 보존, 미해결 상태 POST0, +15/16키입력, 구분자/문자 거절, 정상 재입력·저장 후 목록이동, 모바일 가로넘침 없음 통과.
- 기존14자리 번호를 삭제하며11자리로 교정, 명시적 현재번호 사용 확인 뒤 오류해소, 다시12번째 거절 확인. .local/supplier-phone-input.png 모바일다크 렌더링 확인.
- OS 클립보드를 직접 덮어쓰지 않고 브라우저 insertText로 일괄입력 경로를 검증했다. 실제 저장은 모의 응답이며 사용자DB 변경 없음.
- 서버 검증 변경 없음. API 전체 재실행/새 운영빌드는 이번 입력 UX 수정에서 미수행. git diff --check exit0.
- 대표자명 등 인명에 임의의 문자 정책을 추가하지 않았다. 기존값 보존/국제전화 지원 유지.
- 복구: 이번 입력 helper/폼/테스트 변경만 되돌리고 타 작업 미커밋 변경 보존.
