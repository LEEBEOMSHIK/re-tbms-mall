# WB91 가격·리뷰·평점 검증

- 요구: R05/R96/R98. 구현 root(통합/문서), public_catalog_api(서버), public_catalog_web(웹), 독립검증 public_catalog_review. 날짜2026-10-29.
- 계획: `docs/superpowers/plans/2026-10-29-price-reviews.md`. 계약: `docs/contracts/product-reviews.md`.
- 서버 변경: `services/api/app/reviews.py`, `main.py`, `inventory.py`, `public_catalog.py` 및 관련 테스트. schema15 리뷰/이력 추가, 구매 제공자 기본 차단, 소유권·중복·버전·관리 사유·공개 집계.
- 웹 변경: `apps/web/src/lib/reviews.ts`, storefront DTO, review-rating/product-reviews, 고객 카드/상세/CSS, 관리자 reviews 목록/상세/수정 및 BFF, 상품 가격 이력/관리 접근.
- 보존: `.local/wb91-before.json`와 `.local/wb91-preserve.json` 비교. 기존 products/skus/product_images/product_publications/publication_history 해시 동일, schema14→15. 백업 `.local/catalog.sqlite3.pre-v15-a82ad417-f06d-4e8c-b66d-80e1eba01e49.bak`.

## 실행 결과
- 구현 서버: 전체API435/435, 최종 리뷰23/23, compileall0. 전체 임시 DB 테스트이며 실제 리뷰·가격 입력 없음.
- root 통합 서버: `.venv/Scripts/python.exe -m pytest tests/test_reviews.py tests/test_public_catalog.py tests/test_storefront.py -q` →74/74.
- root 웹: `npm run typecheck`0, 관련11/11, 최종 `node --test tests/*.test.ts`95/95. 최초 작업 보드 상태 오타(in_progress)를 허용값in-progress로 수정 후 전체 통과.
- 구현 웹: 최종 대상 ESLint0. 모바일24px 상품명 영역을 전체 폭으로 보정한 후 재확인했다.
- 독립 서버: 초기 공개 카탈로그 포함44/44, 최종 리뷰23+독립6=29/29 통과. 정상 공장 토큰·익명·위조 주장의 관리/작성 접근 거부, 구매확인 예외503, 공개집계·숨김수정 후 비공개 유지·관리자 별점/본문 변조 차단·가격 경계 확인.
- 독립 웹: 실제 상품 카드/상세 리뷰0건·평균null, 실제 가격null·가격 수정 경로 확인. 합성 리뷰로 목록 검색/페이지 초기화·상세 이력20/5·숨김/답변 저장→목록·일회성 알림 포커스·저장 성공 후 목록 실패 구분·GET 실패 재조회·409 입력 보존·삭제 리뷰 수정 차단 확인. 1440/390·다크24px, 모바일 제목폭 보정 후 재검증. 브라우저 오류0, 실제 리뷰/가격 쓰기0. 근거 `.local/wb91-review-browser.json`, `wb91-real-zero.cjs`, `wb91-focused.cjs`, `wb91-review-editor-mobile-fixed.png`, `wb91-price-mobile.png`. root가 고객 리뷰/관리자 수정 캡처를 직접 시각 검토했다.

## 제한·후속
회원/주문 인증 연결 전 실제 고객 리뷰 작성은 비활성이다. 구매자 작성·본인 수정삭제의 서버 경계는 임시 테스트 제공자로 검증했으며 실제 구매 연동 성공을 의미하지 않는다. 사진 리뷰·할인/정상가·옵션 추가금·반품 후 작성자격은 구현하지 않았다. 고객 이름/구매 증빙의 운영 보관 정책과 주문별 중복 기준은 회원/주문 연결 시 확정한다.

## 복구
새 리뷰 데이터가 생긴 후 과거 DB로 덮어쓰지 않는다. schema15를 이해하는 코드로 forward fix하고 가격/게시 변경은 기존 버전 기반 관리 화면을 사용한다. 리뷰는 사유 있는 숨김·복원으로 관리한다. 로컬 API는8100, 웹3100에서 실행하며 API 감시 범위는app 디렉터리로 한정했다. 푸시/운영 배포 미실행.

판정: 구현 및 독립·통합 검증 완료. 구매 인증 운영 연동은 별도 후속이며 실제 작성 기능을 개방한 상태가 아니다.

## 샘플 가격 표시 후속 확인
2026-10-29 사용자 가격 미표시 지적에 따라 샘플 상품9223bc86-b527-4ece-91fd-7a4153a9dd8d의 price null을 테스트용29000원으로 기존 게시 API를 통해 저장했다. 게시 상태 유지·버전 검사·이력 자동 기록. Playwright 실제 /products 및 /products/{id}에서29,000원 표시 확인. 실제 판매가 확정이 아닌 로컬 샘플 표시용이다. 앞선 보존 검증 이후 이 상품 가격만 명시적으로 변경했다.
