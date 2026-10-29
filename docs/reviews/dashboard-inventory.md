# WB13 / R95 관리자 대시보드 실제 재고 연결 검증

- 검증일: 2026-10-28
- 구현: inventory_dashboard_impl / 독립 검증: inventory_dashboard_verify / 통합: root
- 계획: docs/superpowers/plans/2026-10-28-dashboard-inventory.md

## 변경과 계약 확인
전용 관리자 GET `/api/v1/admin/inventory/overview`와 Next BFF는 현재 SKU 잔고 합계·전체 옵션 수·부족 옵션 수·최대 5개 부족 미리보기를 제공한다. 전체 SKU에 사용 안 함 옵션도 포함하며 부족 경계는 `on_hand <= reorder_point`다. SQL 단일 트랜잭션, 현재 수량/생성순 정렬, 기존 인증·no-store·응답 검증을 확인했다. 신규 DB 마이그레이션이나 업무 쓰기 API 없음.

대시보드 실제 재고 영역은 샘플 영역 위에 별도 배치한다. 합성 재고 카드/목록/업무는 표시에서 제거하고 샘플 업무 개수도 일치시킨다. 보유량과 부족 옵션 단위를 구분한다. 전체/부족 링크는 `stock=all|low` 재고 목록으로 연결하며 상품별 부족 미리보기는 product_id도 전달한다. 비정상·중복 stock 조건은 전체로 확대하지 않고 잘못된 조건으로 표시한다. 목록 작성 폼 추가 없음.

## 독립 실행 결과
- `node --test tests/inventory-overview.test.ts tests/inventory-summary.test.ts tests/dashboard.test.ts`: 13/13, exit0.
- `services/api/.venv/Scripts/python.exe -m pytest services/api/tests/test_inventory_overview.py services/api/tests/test_shipments.py -q --basetemp=.local/pytest-wb13-independent-final`: 22/22, exit0, 3.79초. 별도 임시 DB만 사용.
- 최초 API 실행 21통과/1실패: 신규 테스트가 기존 movement 응답을 201로 잘못 기대함. 기존 계약200에 맞춰 테스트 수정 후 위 22개 재실행 통과. 제품 API 응답 변경 없음.
- 서버 검증: 무인증/잘못된 토큰, 빈 저장소, 입고8→판매출고2→증정1→조정5와 부족 경계, 초과출고 실패 후 불변, 비활성 포함, 미리보기5개 제한, DB 오류503. 샘플 수령/검수 재고불변 및 완제품 검수 전 미반영/입고확정 후 합격수량 반영/반복확정 중복 없음.

## 브라우저 독립 검증
`.local/wb13-review.cjs` 실행 exit0, 결과 `.local/wb13-review.json`.
- 로컬 실제 관리자 테스트 로그인 및 실제 overview와 catalog의 총수량·옵션 수·부족 수 일치 확인(읽기 전용).
- 이후 브라우저 모킹으로 31옵션/보유465/부족21, 비활성 옵션 포함, 미리보기5개 확인.
- 부족 카드 키보드 Enter→부족 목록21개, 전체 카드→전체31개. 검색/부족필터 변경 시 첫 페이지, 페이지당10개 전환과 페이지 이동 확인.
- 모의 입고 후 새로 조회465→495/부족20, 모의 출고 후 focus 복귀466/부족21 확인. 이는 실제 업무 DB 입출고 실행이 아니라 UI 모의 응답 확인이다.
- 조회503/401 때 숫자 제거·재조회/로그인 안내, 빈 데이터0·빈 안내, 부족0일 때 초록 양호 표시 확인. 무인증 BFF401와 관리자 직접URL 로그인 이동 확인.
- 1440px/390px × light/dark 4보기, 실제 body24px 실측, 페이지 가로 넘침 없음. 링크와 값·단위·부족 배지 확인. 별도 입력 폼/저장 UX는 읽기 전용 변경이라 해당 없음.
- 원본 catalog를 시작/끝 실제 요청으로 비교하여 동일 확인. 유효 업무 POST/PUT/DELETE0, 페이지 JavaScript 오류0. 실제 계정 정보나 상품 내용은 검증 문서/결과에 복제하지 않음.
- 캡처: `.local/wb13-stock-390-dark.png`, `.local/wb13-stock-1440-light.png`, 나머지 두 테마/너비 파일 및 전체 화면 파일. 독립 검증자 모바일 패널, root 모바일/데스크톱 패널 직접 시각 확인.

## 통합 확인
root 타입 검사 및 변경 파일 eslint exit0, overview/dashboard/inventory-summary/inventory-flow/workboard 웹20/20 통과. 구현자 관련 API61/61 보고와 별도로 위 독립22개를 실행했다. 디자인 시스템·요구사항R95·결정기록·API계약·계획과 실제 코드 일치를 검토했다.

## 한계·복구
자동 실시간 스트리밍이 아니라 진입/새로 조회/탭 복귀에서 최신 값을 조회한다. 주문 예약·판매 가능 수량·고객 주문/배송 연결은 범위 밖이며 샘플 영역으로 구분한다. 부하·스크린리더 전체 수용시험은 수행하지 않았다. 이번 코드 변경만 복원하면 되며 DB/원장이나 기존 미커밋 작업을 되돌리지 않는다. 커밋·푸시·운영 배포 없음.

판정: 요구 범위의 독립 검증 및 통합 검증 통과.
