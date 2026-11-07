# WB221 관리자 저장 영역 확대
요구 R107/관리자 쓰기 UX. 담당 관리자 공통 UI 및 별도 검증자. WB220 패턴을 admin.css의 admin-save-bar 공통 계약으로 이동한다. 기존 상품·옵션·재고·판매설정 유지, 브랜드소개/자료실, 홈진열/광고, 메뉴구성, 공급처, 상품이미지, 공장설정/요청, 리뷰, 수령·검수에 적용한다.
짧은 카테고리·색상/사이즈 기준정보·부족기준 폼, 모달 빠른추가, 게시/입고확정 단발성 버튼은 제외. 시안편집기는 기존전용 저장바 유지. factory 고객경로 발송 폼 변경안함.
API/권한/계산/저장함수 변경 없음. form/fieldset 안 원래 동작을 유지하며 성공 결과 분기에는 바없음. 모바일44/48터치·safearea·높이500이하 일반배치. 복구는 이번 class/CSS 및 문서변경만 되돌림.
검증계획: 실제 관리자 GET/합성 데이터로 PC1440·모바일390/320 대표경로, 표면별 sticky DOM/입력접근, failure/success 대표회귀. 가이드 영향 brand-about/brand-library/navigation/merchandising/catalog/factory/reviews/shipments 관련원문/캡처 재확인.

## 실행 결과
- 10개 경로 PC1440/모바일390에서 sticky 위치 및 가로 넘침 확인. `.local/wb221-ui.cjs`, 20개 실제 캡처 생성.
- 독립 검증: 리뷰 수정·검수 1440/320, 높이450 일반 배치, 마지막 textarea 접근, 넘침 없음. 합성422 입력 보존→200 완료 안내·저장바 제거 통과. 실제 데이터 쓰기 없음. `.local/wb221-independent.cjs`.
- 가이드 factory/merchandising/brand/navigation/reviews 원문 동기화. menu-edit, merchandising-edit, merchandising-hero, review-edit 캡처 및 표식 갱신. 나머지는 목록/상단 정보 캡처로 저장바 이동 영향 없음.
- 실제 모바일 키보드 단말 검증은 미실행. 브라우저 폭320/390 및 높이450으로 검증. API·권한·재고·금액 로직 변경 없음.

타입 검사·전체 ESLint 통과. 가이드 링크/소스/캡처 검사 4개 통과(캡처 갱신 후 재실행). 실제 PC 광고 및 모바일 브랜드 편집 캡처 시각 확인. 독립 검증자 /root/hold_ui 결함 없음 확인.
