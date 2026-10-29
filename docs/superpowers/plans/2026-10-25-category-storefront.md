# Category storefront and merchandising plan — 2026-10-25

사용자 승인 범위: 카테고리 우선 샘플 쇼핑 홈, 사용자 정의 시즌/기획전 상품 묶음 관리자 구성, /about 분리, 고객 화면 개발 상태 제거. 기존 미커밋 기반 보존.

## 결정과 경계
- 상품·분류는 임시 fixture, 주문/결제·생산/재고 업무 미구현. 고객에게 샘플임을 간결히 표시.
- 로컬 JSON은 샘플 진열 설정용이며 운영 DB 결정 아님. 실제 관리자 인증 대신 로컬 개발 전용 bearer key로 관리 API 보호. key 미설정은 관리 비활성.
- 기존 web3100/api8100·Next.js/FastAPI 유지. Docker 없음.
- 고객 홈과 about에 API 상태·개발 진행 안내·관리 링크 노출 없음.

## API 계약
Product: {id,name,category_id,price,image,color,description}; price KRW integer demo. image='/images/products/{id}.svg'.
Category: {id,name}; ids tops,outer,bottoms,dresses.
Section: {id,title,subtitle,kind:'category'|'collection',product_ids:string[],enabled:boolean}.
GET /api/v1/storefront -> {revision:int,categories:Category[],products:Product[],sections:Section[]} 공개 enabled만. sections 배열 순서가 노출 순서.
GET /api/v1/admin/storefront -> 동일 구조 전체 sections (Authorization: Bearer STORE_ADMIN_TOKEN).
PUT /api/v1/admin/storefront body {revision:int,sections:Section[]} -> 전체 구조; revision 증가. 잘못된 상품·중복 section/product·길이 오류422; stale revision409; token 미설정503, 무인증/오인증401. 빈 sections 허용, UI 빈 상태.
기본 fixture products p001..p012; 각 3개 tops p001..003, outer004..006, bottoms007..009, dresses010..012.

## 작업과 소유권
- Backend agent: services/api만. fixture·검증 모델·JSON atomic replace/lock·revision·권한·API/CORS. 기존 health 유지. tests 선작성 후 전체 pytest. 다른 파일·커밋 금지.
- Frontend agent: apps/web만. / 상품먼저 카테고리 필터+섹션·상품 보기, /about 회사소개 임시 문구, /admin/merchandising 접근키 입력/섹션 추가·수정·삭제·순서·enabled·상품 선택/상품 순서·저장/충돌. 키는 메모리에만 유지. UI에 로컬 편집 범위 설명. 입력형 실패·재시도·빈 상태. 시맨틱 CSS토큰·모바일·키보드. 샘플 SVG 상품12개.
- Coordinator: 관리자 로컬키 생성(.env 비추적), 문서·검증기록·통합검증. 기존 .env 값 보존.
- Independent reviewer: 전체 요구·코드·API 인증/검증/동시성·모바일·데이터 지속성 리뷰.

## 수용 기준
- 첫 화면에 상품 카드/분류가 나타나고 히어로 진행 설명 없음. about 경로 작동.
- 관리자 편집 저장→고객 새로고침에서 제목·순서·상품·공개 상태 반영. 비공개 섹션은 공개 API에 없음.
- 무인증 변경 차단, 키 브라우저 번들/스토리지에 없음. stale 수정 거절, 실패 파일 미변경.
- 재시작 후 설정 유지, 손상 파일을 기본으로 덮어쓰지 않음.
- API 전체 tests, web tests/lint/typecheck/build, 실제 browser desktop/mobile·관리자 저장 E2E 및 테스트 설정 복원.
