# 상품 리뷰 계약 — WB91

## 범위와 보안
리뷰는 해당 상품 구매 고객만 작성하고 본인만 수정·삭제한다. 현재 고객 회원/주문 인증이 없으므로 실제 서비스의 쓰기 제공자는 차단 상태다. 클라이언트의 고객 ID·주문 ID·구매 완료 플래그·공장/관리자 권한으로 구매 인증을 대체하지 않는다. 향후 서버 고객 세션과 신뢰 주문 조회를 연결한다. 배송/환불 등 구매 인정 조건은 연동 시 확정한다.

현재 리뷰는 정수 별점1~5와 텍스트1~3000자다. 사진은 후속. 동일 고객·상품의 삭제되지 않은 리뷰는 하나로 제한하는 기술 기본값을 사용하며 주문별 중복 허용 여부는 추후 결정한다. 고객 삭제는 집계에서 제외하고 기록을 보존하며 관리자가 복원하지 않는다. 관리자에게 고객 별점·본문 변경 권한은 없다.

## 공개 조회
- PublicProduct에 `review_summary:{average_rating:number|null,review_count:number}` 추가. 공개·미삭제 리뷰만 같은 기준으로 집계하고 평균은 소수점1자리. 0건일 때 null.
- GET `/api/v1/products/{product_id}/reviews?page=1&page_size=10|20|50`
- 응답 `{reviews:[{id,rating,body,author_label,created_at,updated_at,reply}],total,page,page_size,summary:{average_rating,review_count},can_write:false,write_unavailable_reason:'purchase_verification_unavailable'}`.
- 게시 가능한 공개 상품에만 접근. 정확한 고객/구매 식별자·관리 사유·감사 이력은 공개하지 않는다.
- 현재 고객 UI는 리뷰 조회만 제공한다. 0건은 정상 응답에서만 표시하고 통신 실패는 재시도 상태다.

## 내부 관리
- GET `/api/v1/admin/reviews?product_id=&visibility=all|visible|hidden|deleted` → `{reviews:[AdminReview]}`
- GET `/api/v1/admin/reviews/{id}` → AdminReview
- AdminReview `{id,product_id,product_name,rating,body,author_label,hidden,deleted,reply,version,created_at,updated_at,history:[{action,reason,created_at}]}`
- PUT `/api/v1/admin/reviews/{id}` body `{version,hidden,reason,reply}`. 사유1~500자, 답변0~2000자. 충돌409, 고객 삭제 리뷰 변경 금지.
- 내부 관리자 인증 필수. 공장 계정은 접근 불가. 평균을 직접 설정하는 API는 없다.

## 향후 고객 쓰기 연결부
- POST `/api/v1/products/{product_id}/reviews` body `{id:uuid,rating,body}`
- PUT `/api/v1/products/{product_id}/reviews/{id}` body `{version,rating,body}`
- DELETE 같은 경로 body `{version}`
- 신뢰 제공자가 고객 인증과 해당 상품 구매를 확인한 경우에만 도메인 저장 허용. 현재 제공자는 실패로 닫히며 테스트에서만 인증/구매 공급자를 주입한다.
- 타인 리뷰, 미구매, 위조 식별 필드, 잘못된 별점, 중복 요청/오래된 버전의 동작을 서버에서 검증한다.

## 가격
기존 `/admin/products/{id}/publication`의 price/status/version 및 history를 사용한다. 원화 정수0~1,000,000,000, 미입력null. WB92에서 기본가·선택 할인가를 추가했으며 [판매 가격 계약](sale-price.md)을 따른다. 옵션금액·가격 적용예약·실결제 도입 없음. 조회/저장 실패를0원이나 저장완료로 표시하지 않는다.

## 호환·마이그레이션
schema14에서15로 리뷰·이력만 추가한다. 적용 전 SQLite 백업 후 기존 상품/재고/이미지/게시 데이터를 보존한다. 롤백은 새 데이터 보존 계획을 갖춘 forward fix를 우선하며 과거 DB 덮어쓰기 금지. 구체 실행 근거는 검증 보고서에 기록한다.
