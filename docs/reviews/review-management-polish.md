# WB223 리뷰 관리 개선
목적: 고객 의견과 답변 필요 여부를 빠르게 확인. 범위 review-pages.tsx/reviews.css, 로컬 seed, 디자인 시스템·가이드 reviews·작업보드. 담당 관리자 UI/독립 검증. 목록은 요약+필터+정돈된 표, 모바일 카드. 상세/수정 원문·답변·내부 사유 분리. 기존 API·version 충돌·구매인증 차단 유지. 별도 목록/상세/수정 URL 유지.
수용: 검색·공개/답변 필터·0건·PC/모바일·답변/숨김저장·실패 입력 보존. 합성 데이터는 [테스트] 표시, 실제회원 연계 없음. 로컬 DB 백업 후 deterministic ID로 insert-only. 복구는 이번 소스 diff 및 합성 ID의 행/이력만 대상(전체 DB 복원 금지).

## 검증 결과
- 로컬 catalog.sqlite3에 합성8건 insert-only 추가. [테스트] 작성자 및 실제 구매 후기 아님 표시. .local/catalog.pre-review-demo-*.bak 백업 생성. 실제 고객·주문·재고 변경 없음. scripts/seed_local_reviews.py --local-demo로 재사용 가능. 관리자 /admin/reviews에서 조회. 공개 리뷰는 해당 로컬 상품 후기에도 표시됨.
- PC1440/태블릿768/모바일390·320 목록/상세/수정 12보기 가로넘침 없음. .local/wb223-ui.cjs. 초기 검색 검증은 조회 대기 누락으로 실패하여 대기를 추가하고 재실행 통과. 검색8건/0건/답변 대기 필터 및 합성답변 실제 저장/완료 안내 확인.
- 독립 검증 review_ui_review: 웹 reviews 3/3, API reviews 23/23 통과. 초기 제한환경 API 테스트 멈춤으로 종료 후 독립 basetemp 실행 통과. API/구매인증/삭제보호/충돌보호 변경 없음.
- 타입·변경파일 ESLint 통과. 가이드 reviews 원문·reviews:0/1 캡처/표식 동기화.
- 복구: deterministic UUID 이름 retag-local-review-demo-0~7의 review_history→product_reviews만 삭제 가능. 기존 DB 전체 복원 금지.

- .local/wb223-flow.cjs 공개/숨김/삭제 필터, 합성 숨김→공개 복원 및 처리이력, 모의409 입력보존/재저장차단 통과. 실제 고객 리뷰 수정 없음. 시드 재실행 추가0건 확인. 가이드4·웹리뷰3 테스트 통과. PC목록/수정·모바일카드 실제캡처 시각 확인.
