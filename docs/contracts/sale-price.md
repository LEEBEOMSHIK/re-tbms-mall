# 판매 가격·할인 계약 — WB92

기존 게시 API·권한·버전/공개 준비조건은 유지한다. 고객 가격 라벨은 판매 가격이다.

| 필드 | 의미 |
|---|---|
| price | 기본 판매가격, null 또는0~1,000,000,000 정수 |
| discount_price | 할인 판매가격, null이면 해제/미적용 |
| effective_price | 서버 계산 최종 판매가격: discount_price ?? price |
| discount_rate | 할인시 floor((price-discount_price)*100/price), 아니면null |

할인값이 있으면 기본가>0 필수이며0<=할인가<기본가다. bool·소수·문자열·초과금액은 거부한다. 서버 계산필드를 클라이언트가 제출하면 거부한다.

PUT `/api/v1/admin/products/{id}/publication`은 기존 status/price/version에 discount_price를 추가한다. 구클라이언트가 생략하면 기존할인을 보존하며, 명시null이면 해제한다. 기본가 변경으로 기존할인이 유효하지 않으면422. 웹은항상 할인값을명시한다. 버전불일치는409이며 덮어쓰지 않는다.

관리 조회/저장·공개 Product·게시가격 history에 네 가격필드를 함께 제공한다. 과거 이력/기존 가격은 discount_price null로 확장한다. schema16은 product_publications/publication_history에 nullable할인가를추가하며 직전schema15백업을남긴다.

고객: 정상가만 있으면 판매 가격+금액. 할인시 기본가취소선+할인율+판매 가격+최종금액.0%로 내림된 작은 할인은 퍼센트배지를생략한다. 기본가/할인가가없으면0원으로대체하지 않는다.

쿠폰·기간예약·회원별/옵션별가격·실결제/환불 가격은 이번 계약에 포함하지 않는다. WB91의 할인 미지원 문구는 이 계약으로 대체한다.
