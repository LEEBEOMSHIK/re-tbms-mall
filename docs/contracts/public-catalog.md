# 실제 상품 게시·공개 카탈로그 계약 — WB87

## 게시 설정
내부 관리자 GET/PUT `/api/v1/admin/products/{product_id}/publication`.
PUT `{status:'draft'|'published'|'paused', price:integer|null, version:integer}`. price는 표시용 원 단위 기존 쇼핑 UI 관례이며 0..1,000,000,000, null은 미정이다. 결제/주문 가격 확정이 아니다. version은 상품 기본정보 version과 별도인 게시 설정 버전(초기0)이다. 변경불가 필드/추가필드 거부, 인증401, 대상없음404, 충돌409, 입력/게시조건422.
응답 `{product_id,product_name,internal_name,status,price,version,public_visible,can_publish,reasons:string[],history:[{status,price,created_at}]}`. 최신 이력부터 제공한다. 내부 관리자 인증의 현행 단일 역할 변경 기록이며 개별 직원 식별은 현행 인증 범위 밖이다.

준비중/중지에서 게시로 전환하려면 고객설명·고객용이미지(model/garment)·활성 대/소분류·재고있는 활성옵션이 필요하다. 게시 후 활성옵션 재고0은 품절로 공개 유지하며 가격수정도 가능하다. 게시후 이미지/설명/활성분류/활성옵션 자체가 없어지면 공개 조회에서 제외하고 상세/이미지는404를 반환한다. 기존 상품 자동게시 없음. 가격은 선택이다.
관리자 catalog products 추가필드 `publication_status`, `publication_visible`, `publication_can_publish`, `publication_reasons`.

## 고객 조회
GET `/api/v1/products` → `{categories:[{id,name,parent_id}],products:PublicProduct[]}`.
GET `/api/v1/products/{product_id}` → PublicProduct.
PublicProduct `{id,name,category_id,description,price:number|null,image:string,color:string,sold_out:boolean,options:[{id,color,size,available:boolean}],images:[{id,kind:'model'|'garment',name,alt,url}]}`.
가격없는 상품을0으로 변환하지 않는다. SKU는 활성만 제공하고 available은 현재수량>0이다. 실제 내부명/SKU코드/재고수량/공장/시안/비공개메모는 제외한다. 클라이언트 검색·색상/사이즈 필터는 같은 options 원소 조합에서 판정한다.
GET `/api/v1/products/{pid}/images/{iid}` → 검증된 PNG/JPEG/WebP bytes, no-store/nosniff. 매번 공개상품조건 및 이미지 product/kind 일치를 검사한다. 게시중지/내부시안/다른상품이미지404. 이미지 URL은 위 API 상대경로이며 data_url은 응답에 포함하지 않는다.

## 홈 진열
기존 `/api/v1/storefront`, 관리자 GET/PUT `/api/v1/admin/storefront` envelope `{revision,categories,products,sections}` 유지. products는 실제 PublicProduct이며 관리자만 unpublished 포함 및 `publication_status` 추가. 없는 고객이미지는 관리자 image='' 가능. 공개는 공개조건충족 상품만, 진열 sections.product_ids도 공개가능 ID만 남기며 빈/비활성 section 제외한다.
과거 JSON 설정은 읽기 때 변경하지 않고 제목/순서를 보존한다. 과거 샘플 ID는 응답에서 제외해 관리자 재선택/저장 가능하며 신규저장에는 실제 상품 ID만 허용한다. revision충돌409·원자적 파일교체 유지.

## 저장소
schema13→14는 product_publications, publication_history 두 테이블을 추가한다. 상품/SKU/원장/이미지는 수정하지 않는다. 마이그레이션 전 `.pre-v14-UUID.bak` 파일로13 DB를 보존한다. 이전버전 코드는14를 거부하므로 코드만 되돌리는 복구는 불가하다. 백업복원시 이후 업무기록을 보존/대사하거나14호환 코드로 전진수정한다. 새기능 데이터는 없던 상품을자동게시하지 않는다.

public_visible/publication_visible는 published이고 고객이미지·설명·분류·활성옵션 조건이 유지되는지 표시한다. 재고0은 false 사유가 아니다. 관리자에서 게시설정은 유지되지만 구조조건 부족으로 비공개인 상품과 품절 공개상품을 구별한다.
