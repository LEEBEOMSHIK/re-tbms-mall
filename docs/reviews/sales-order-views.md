# WB143 고객·관리자 주문 조회 검증

2026-11-01 / 구현 root·backend·메뉴 담당 / 독립 customer_account_review.

- 범위와 변경: `docs/superpowers/plans/2026-11-01-sales-order-views.md`, `docs/contracts/sales-orders.md`. PG·상태 변경·재고 쓰기 제외.
- API 담당 관련 60개, 메뉴 API 32개 통과. 독립 주문 API 13개 및 웹 6개 통과. 최종 웹 주문/메뉴/가이드/캡처 15개 통과. 타입 검사 통과. lint에서 미사용 import 2건 발견 후 제거, 최종 타입/lint 재실행 통과. 독립 최종 웹10개 통과 및 추가 차단 이슈 없음.
- 별도 3121/8121 서버와 `.local/wb143-qa/orders.demo.sqlite3` 합성 데이터 6건 사용. 실제 3100/8100과 고객 DB를 변경하지 않음.
- PC 1280, 모바일 390: 고객 목록·상세, 관리자 직접 URL 로그인 이동·목록·상세, 일부발송 및 결과불명확 상태, 합성 표시 확인. 상세 2개×29,000원=58,000원/배송 0원 확인. 모바일 상세 가로 넘침 없음.
- 관리자 취소됨 필터 빈 목록 확인, 동일값 재선택 후 새로 조회 활성 확인. 독립 검토 지적의 이전 상세 노출·로그아웃 뒤 지연 응답·영문 배송 상태·동일 필터 무한 로딩 수정. 관리자 공통 dl 스타일 충돌로 금액이 줄바꿈되는 문제도 수정.
- 가이드 `sales-orders`, `start` 동기화. 인증 가이드에서 실제 JPG 로드와 확대 표식(주문 관리/상태 필터) 위치 시각 확인. 가이드 링크/소스/이미지 크기 테스트 통과.
- 캡처: `.local/wb143-customer-list.png`, `.local/wb143-customer-detail.png`, `.local/wb143-mobile-detail.png`, `.local/wb143-admin-list.png`, `.local/wb143-admin-detail.png`, `.local/wb143-admin-mobile.png`. 가이드 자산은 `apps/web/guide-assets/sales-orders-*.jpg`.
- 남음: 실제 PG/주문 생성·취소·환불·재고예약·송장 입력/상태 변경은 후속 범위. 주 개발 서버 재시작 후 빈 실데이터 조회 점검은 별도이며 현재 결과는 격리 환경 통합 검증이다.
- 복구: 코드 되돌림, 합성 DB/캡처 보존. 추가 테이블 자동 삭제 없음.
