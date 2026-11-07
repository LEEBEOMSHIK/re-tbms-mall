# WB206 · 입력·선택 디테일

- 요구 R107, 목적: 사이트 공통 입력 요소의 기본/선택/초점/읽기전용/오류 상태를 정돈한다.
- 담당 root 공통 스타일/문서·통합, 별도 검증자. 범위 form-controls.css, cart 체크 표시, 디자인시스템 갤러리 및 관련 가이드.
- 방향: 중성 윤곽과48px 기본 높이·10px 모서리, 퍼플 초점과 채운 체크,64px 선택 카드, 정렬된 라벨·보조문구·드롭다운.
- 계약: 네이티브 input/checkbox/radio 의미·키보드·required·disabled/readonly·저장 처리 보존. 패키지·API·데이터 변경 없음.
- 수용: PC1440/모바일390·320에서 입력/선택/해제/부분선택/키보드·오류/disabled·라이트/다크·강제색상 검증. 상품 기본정보 저장 시 입력 유지/실패/결과는 합성 응답으로 확인.
- 의존: 기존 디자인 토큰·FormChoice·FormSelect·고객 장바구니. 상품 카드 구조는 변경하지 않는다.
- 가이드: catalog와design-system 원문·캡처 위치 확인 후 필요한 대표 캡처 갱신, 업무 순서 변경 없음.
- 복구: 본 작업의 공통 스타일/예시만 되돌리며 기존 미커밋 변경 보존.

## 구현·검증 결과 (2026-11-05)

- 공통 입력은48px/10px 윤곽, 중성 기본선·퍼플 hover/focus·읽기 전용 배경으로 정돈했다. 필수/오류 의미와 저장 로직은 보존했다.
- 네이티브 체크/부분 선택/라디오 표시, 선택 카드의 채운 체크, 모바일 계절2열을 적용했다. 갤러리에 실제 조작 가능한 체크·라디오 예시를 추가했다.
- 수정 파일: `apps/web/src/components/ui/form-controls.css`, `customer-cart.tsx`, 관리자 `catalog/catalog.css`, `design-system/gallery.tsx`·`gallery.module.css`, `apps/web/src/lib/admin-guide.ts`·`admin-guide-captures.ts`, 비공개 가이드 캡처2장, 디자인 시스템·본 검증 문서·작업 보드.
- 실제3100, PC1440/모바일390·320: 상품 입력/focus 크기 유지, 계절 선택/사계절 배타 선택, 드롭다운 열기/Escape, 읽기 전용, 라이트/다크, 가로 넘침 없음. 고객 배송 정보 입력 및 기본 배송지 체크, 장바구니 부분 선택·전체 선택·수량 변경 확인.
- 상품 저장은 PUT만 합성 응답으로 대체: 빈 필수값 요청 차단,422실패 입력 보존, 재시도 성공 결과와 ‘계속 수정’ 복귀 확인. 실제 상품·고객 데이터는 저장하지 않았다. API 구현 변경이 없어 백엔드 전체 테스트는 재실행하지 않았다.
- 독립 검증자 hold_ui가 PC1440/390/320에서 Space/Arrow 선택, 부분 선택, readonly, 오류 테두리, disabled,48px 입력·64px 카드, 다크·강제 색상·동작 줄이기를 재검증했다. fieldset disabled는 실제 공통CSS를 적용한 격리 합성 DOM 검사다.
- 독립 검증에서 발견한 disabled 커서 우선순위와 fresh `/cart`의 공통CSS 미로딩을 수정하고 재검증 통과했다. 테스트 도구의 초기 계절ID·상품조회URL·가이드 선택 hash 오류는 올바른 실제 경로로 수정 후 재실행했다.
- 가이드 catalog/design-system 원문과 대표 캡처를 갱신했다. 실제3100의 인증 이미지 로드·확대·닫기 및 상품 탭/입력 클릭 표식 정렬을 시각 확인했다. 다른 업무 순서·버튼 문구·URL 계약은 변경하지 않았다.
- 실행 근거: `.local/wb206-check.cjs`·`wb206-check.log`, `.local/wb206-independent.cjs`·`.json`, `.local/wb206-guide.cjs`, `.local/wb206-final-captures.cjs`. 로컬 검증 산출물은 캐시 정책에 따라 ignored로 유지한다.
- 웹248개 통과(가이드 파일 크기·좌표·원문 링크/작업보드 포함), TypeScript·전체lint 통과. 별도 실기기 검사는 미실행이며 모바일 검증은 Chrome viewport 기반이다.
