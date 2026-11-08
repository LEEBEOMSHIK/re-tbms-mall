# WB228 저장·실패·완료·모달 검증

- 요구: R107/R111. 담당: root 구현·통합 확인, save_flow_independent 독립 검증.
- 환경: 2026-11-07, localhost:3100, Chrome PC 1440×900 / 모바일 에뮬레이션 390×900.
- 범위: 상품 기본정보, 리뷰 답변·사유, 브랜드 초안, 홈 진열 섹션, 배송지, 주문서 입력 유지, 장바구니 실패 복구와 배송 안내 모달.
- 계약: 기존 API·타입 유지, 패키지 추가 없음. 브라우저 합성 응답으로 쓰기를 대체하고 실제 업무 데이터 변경 차단. 실제 서버 DB 저장·실기기 키보드·실 PG/택배 연동 검증은 이번 범위 밖.

## 재현과 수정
1. 리뷰·브랜드 저장 실패 안내가 화면 밖에 있어 실패를 알아보기 어려웠다. 공통 useFeedbackFocus를 추가하고 상품·리뷰·브랜드·홈 진열·배송정보 제출 오류에 적용했다. 입력값을 보존하면서 오류로 초점과 스크롤을 이동한다.
2. 브랜드 초안 저장 성공 뒤 편집 폼과 하단 저장바가 그대로 남았다. 완료 안내로 교체하고 계속 편집으로 서버 확정 값을 유지하며 첫 입력으로 복귀한다.
3. 배송정보가 없는 주문서에서 기본 배송지가 있어도 이전 프로필 이름·연락처만 불러왔다. 기본 배송지 전체를 우선 적용한다. 작성 중 복원 입력과 기존 주문서 배송정보는 덮어쓰지 않는다.

## 실행 결과
| 흐름 | PC·모바일 확인 |
|---|---|
| 상품·홈 진열·배송지 | 422 실패 입력 유지·오류 초점, 200 저장 완료 안내·완료 제목 초점 |
| 리뷰 | 422 사유·답변 보존, 최신 상태 조회 후 재시도, 저장 성공 후 목록503을 별도 표시 |
| 브랜드 | 422 제목·마지막 입력 보존, 오류가 뷰포트 내부로 이동, 성공 후 폼/저장바 숨김, 계속 편집 시 확정 입력 복원 |
| 주문서 | 기본 배송지 받는 분 자동 입력, 작성 메모 새로고침 유지, 결제 준비 중 비활성, 합성 주소 선택 후 우편번호 적용·상세주소 초점 |
| 장바구니 | 422/409 실패 시 수량·합계 복구, 503 응답 불확실 시 동일 request_id 재시도·버전 한 번 증가 |
| 배송 안내 모달 | 열기 전후 배경 수평 위치 동일, Escape 닫기·버튼 초점 복귀, 라이트/다크 캡처 |

웹 테스트 250/250, typecheck, lint 통과. 문서 갱신 후 가이드 참조·캡처 검사 4/4 통과. 별도 검증자가 리뷰·브랜드 흐름을 두 폭에서 재실행하고 checkout 기본 배송지 우선순위 소스를 검토했다. 실제 캡처의 브랜드 완료/배송지 실패/모바일 모달을 시각 확인했다.

기존 장바구니 검증 스크립트는 과거 링크 CTA와 저장 중 비활성화 가정을 사용하여 실패했다. 현재 버튼 CTA 및 저장 중 버튼 유지 정책에 맞춰 검증 조건을 고친 뒤 위 실패 복구 시나리오를 통과했다. 이 과정에서 제품 장바구니 코드는 변경하지 않았다.

## 변경·가이드·근거
- 공통: apps/web/src/components/ui/use-feedback-focus.ts
- 적용: brand-about/brand-admin.tsx, catalog/catalog-forms.tsx, merchandising/merchandising-editor.tsx, reviews/review-pages.tsx, components/customer-account.tsx
- 기본 배송지: apps/web/src/components/live-checkout.tsx
- 문서: docs/design-system.md, workboard.md, 이 기록
- 가이드 ID catalog/merchandising/brand/reviews 오류·완료 안내 동기화. brand:1에 실제 합성 완료 화면 apps/web/guide-assets/brand-save-result.jpg와 계속 편집 표식을 추가했다. public에 노출하지 않는다. 나머지 화면은 버튼 위치·입력 구조가 유지되므로 기존 캡처 유지.
- 로컬 실행 근거: .local/wb228-flows.cjs 및 .json, .local/wb228-independent.cjs 및 -results.json, .local/wb228-cart-failure.cjs. 합성 응답 전용 도구이며 캐시 정책에 따라 커밋 대상 아님.
- 실제 캡처: .local/wb228-address-{error,success}-{1440,390}.png, wb228-product-*, wb228-merch-*, wb228-checkout-*, wb228-shipping-modal-*, wb228-independent-brand-*, wb228-independent-review-*.
- 복구: WB228 변경만 되돌린다. 데이터 마이그레이션·삭제 없음. 기존 next-env.d.ts 자동 변경은 별도 보존.
- 다음: PG·택배사 선정과 무관한 나머지 관리 쓰기 화면/실기기 키보드 점검. 이번 대표 흐름 결과를 모든 화면의 DB 저장 검증으로 확대 해석하지 않는다.
