# 상품·SKU·재고 로컬 관리 검증

날짜: 2026-10-26 / WB06 / R03·R04 일부·R07·R18
계획: docs/superpowers/plans/2026-10-26-catalog-inventory.md

## 범위와 담당

inventory_api는 FastAPI·SQLite 저장·재고 불변식 테스트, inventory_ui는 관리자 화면과 BFF를 구현했다. inventory_review는 독립 소스 검토·API/웹 테스트·빌드를 수행했고 조정 담당은 메뉴·문서·실제 브라우저 통합을 검증했다.

변경 파일: services/api/app/inventory.py, services/api/app/main.py, services/api/tests/test_inventory.py; apps/web/src/lib/catalog.ts·catalog-proxy.ts, src/app/api/admin의 catalog·products·skus·inventory 경로, src/app/admin/(protected)/catalog, 관리자 탐색·대시보드 바로가기와 tests/catalog.test.ts. 관련 요구·결정·데이터/API·디자인 문서와 README, workboard.md를 갱신했다.

## 실행 결과

- API: 가상환경 Python으로 pytest 전체 80개 통과. 독립 실행은 --basetemp .local/pytest-inventory-independent-review 사용. 인증, 빈 DB 등록, 재시작 영속성, SKU 코드·옵션 중복, 엄격한 정수/상한·음수 거부, 오래된 버전, 동일 UUID 재전송, 다른 payload 거부, 동시 차감, 원장 저장 실패 시 잔고 롤백, 미지원 스키마·손상 시 비파괴 오류를 확인했다.
- 웹: apps/web에서 npm test 29개 통과, npm run lint·typecheck·build 성공. 신규 관리자 페이지와 5개 BFF 경로의 빌드를 확인했다.
- Edge 통합: 비인증 조회 401, 다른 Origin 변경 403, 관리자 로그인→메뉴→상품 등록/수정→SKU 등록(재고 0)→10개 증가→3개 감소→잔고 7과 원장 2건 확인. 8개 감소는 거부되고 입력이 보존되었다. 페이지 재조회 후 저장값을 확인했다.
- 저장은 성공했으나 응답만 503으로 끊는 상황을 재현했다. 같은 입력 재시도 시 최초 request_id와 version이 유지되고 원장/잔고가 한 번만 반영되었다.
- 320·390·1440px에서 문서 가로 넘침 없음, 표 영역 내부 스크롤 확인. 모바일 화면 이미지 검토 및 JavaScript 오류 없음. 전체 스크린리더 인증·성능 부하 시험은 수행하지 않았다.

초기 브라우저 검증에서 값이 있는 textarea를 감싼 label의 텍스트가 정확한 레이블 조회를 방해했다. 설명/변경 사유를 htmlFor·id로 명시적으로 연결하고 본문 건너뛰기 대상을 추가했다. 수정 후 독립 lint·typecheck, 전체 브라우저 흐름을 다시 통과했다. 이 마크업 보완 뒤 production build는 반복하지 않았다. 테스트의 상품 수정 확인도 PUT 응답 완료를 기다리도록 보정했다.

브라우저 검증은 합성 상품 1개·SKU 1개·원장 2건만 사용했다. 종료 후 해당 테스트의 이름·ID·내용·잔고를 대조해 해당 행만 제거했으며 다른 사용자 데이터와 DB 파일은 보존했다. 테스트 도구와 캡처는 Git 제외 .local/에 있다.

## 제한·인수인계·복구

현재는 고객 게시 전 초안과 수동 SKU 잔고다. 가격·주문 예약·격리·배송 자동 연동과 운영 DB, 개인 계정 감사는 미구현/미정이다. actor는 공용 local-admin이다. 관리자 대시보드는 아직 고정 샘플이며 WB13에서 재고 영역을 연결할 예정이다. 대량 목록 페이지 분할과 운영 부하 검증도 후속이다.

같은 화면에서 같은 입력을 재시도할 때 요청 번호를 유지한다. 전체 새로고침/탭 종료로 메모리의 요청 번호가 사라지므로 응답이 불명확하면 변경 이력을 먼저 확인해야 한다. 상품 생성 자체에는 멱등 요청 번호가 없으므로 응답 불명확 시 목록 확인 후 다시 등록한다.

DB는 .local/catalog.sqlite3이며 Git 제외다. 코드 복구 시에도 DB를 삭제하지 않는다. API를 정상 종료한 상태의 DB 관련 파일 백업 또는 SQLite 온라인 백업으로 보관하고 호환되는 코드와 함께 복구한다. 지원하지 않는 user_version은 자동 초기화하지 않는다. 로컬 Docker·새 패키지·실결제·외부 메시지·운영 변경·커밋/푸시는 수행하지 않았다.
