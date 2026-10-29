# WB87 / R96 실제 상품 게시·고객 탐색 독립 검증

- 검증일: 2026-10-28
- 구현: public_catalog_api / public_catalog_web
- 독립 검증: public_catalog_review / 통합: root
- 계약: docs/contracts/public-catalog.md

## 검토 범위
명시적 게시·중지와 표시가격, 공개상품/이미지 allowlist, 실제 진열 연결, 고객 홈·목록·검색·필터·상세·옵션·품절, 관리자 분리된 편집 화면과 저장 후 상품 상세 복귀. 주문·결제 도입은 범위 밖이다.

## 발견·수정한 결함
1. 게시 편집 최초 조회 실패 후 재조회 성공 시 입력이 기본 draft/null에 남는 문제: 최초 성공 조회는 서버 상태/가격으로 초기화, 기존 편집이 있는 재조회는 입력 보존으로 수정. 응답 product_id·저장 version 증가 검증도 추가했다.
2. 고객 목록 FormSelect에 ds-form 범위가 없어 native/custom 두 컨트롤이 동시에 보인 문제: 공통 스타일 범위 적용 후 실제 native bbox1px/clip, custom control 표시와 캡처로 확인했다.
3. 고객 6개 FormSelect의 aria-labelledby 대상이 없는 문제: 각 필드의 명시적 라벨 ID 적용 후 정확한 accessible name(카테고리·색상·사이즈·재고·정렬·표시 개수), 키보드 팝업/Escape 포커스 복귀를 확인했다.
4. 게시 설정은 published지만 구조적 조건 누락으로 실제 공개 제외되는 상태: public_visible/publication_visible 추가, 관리자에서 고객 화면 제외 안내를 표시한다. 활성 옵션의 재고만0인 경우는 visible=true인 게시중 품절로 구분한다.
5. 상품 상세 ID 변경 시 이전 선택/이미지 잔류 가능성: 페이지의 id key로 상태를 새로 구성한다.

## 독립 API 실행
`services/api/.venv/Scripts/python.exe -m pytest services/api/tests/test_public_catalog.py services/api/tests/test_storefront.py .local/wb87-independent-api.py -q --basetemp=.local/pytest-wb87-independent-all`

- 56/56 통과, exit0, 14.57초. 모든 업무 쓰기는 격리된 임시 DB/JSON 파일만 사용했다.
- 별도 작성5개 검증: 비공개 DTO 필드/시안이미지/다른상품이미지/게시중지 이미지 차단, 품절 공개 유지와 가격수정, 활성옵션 모두 비활성·마지막 고객이미지삭제 후 공개차단, 과거 진열JSON 읽기불변과 공개가능 상품만 노출, schema13 백업 및14 이관 후 기존 테이블 불변.
- 게시 권한·추가필드·버전 충돌·게시 조건·활성 옵션·상품 상태·이미지·진열 revision/순서/숨김·파일 실패 처리는 구현 테스트를 독립 실행해 확인했다.
- 초기 독립 스크립트에서 관리자 GET 인증 헤더 누락을 수정한 후5개 재실행 및 위56개 통과. 제품 API 결함이 아닌 검증 코드 수정이다.
- 샌드박스 TestClient 실행이 멈춰 해당 실행을 중지하고 같은 임시 DB 테스트를 허용된 로컬 소켓 환경에서 재실행했다.

## 브라우저 및 실제 BFF
`.local/wb87-review.cjs`와 `.local/wb87-focused-review.cjs`, 결과 `.local/wb87-review.json`.

- 고객 홈/목록/상세 ×1440/390px ×light/dark =12보기. 추가 고객 필터 팝업4보기·관리자 게시편집4보기, 총20보기. 실제 본문24px, 페이지 가로 넘침 없음.
- 최대12개 진열/25개 모의상품 목록, 페이지12→24개와 페이지 초기화, 상품검색, 색상+사이즈가 동일 SKU에 없는 조합0건, 재고있는 옵션만 필터 확인.
- 상세 이미지 전환, 색상변경 후 사이즈 초기화와 실제 조합만 선택, 품절 옵션/재고 있는 옵션 구분, null 가격 미표시, 구매/장바구니/결제 동작 미노출 확인.
- 상세→목록의 검색·필터 URL 복원. 홈에서 진열이 모두 제외되면 임의 전체상품 fallback이 나타나지 않음.
- 빈 데이터/404/503/재시도 확인. 개인정보·내부관리명·실제 수량을 고객 화면 모의 DTO에 넣지 않았으며 서버 공개 allowlist 검증은 별도 API에서 수행했다.
- 관리자 최초조회503→재조회에서 기존 published/32000 초기화, 수정 후409에서 입력 paused/33000 보존 및 재저장 차단, 최신 version4 조회 후 저장, 상세 복귀·저장 알림 focus·재로드 시 알림 소멸 확인. 관리자 저장2회는 전부 브라우저 route mock이고 실제 업무 쓰기0.
- 게시 설정 유지지만 고객 화면 제외 안내를 관리자 편집에서 정확한 문구로 확인했다.
- 최종 고객 팝업의 검색입력 배경은 테마 전환 완료를 기다린 후 측정: light rgb(255,255,255), dark rgb(23,25,29), 두 폭 모두 body surface와 일치. 중간 전환색으로 회색처럼 캡처된 초기 이미지는 최종 캡처로 교체했다.
- 실제 BFF 읽기 검증: /api/shop/storefront200·공개상품/진열0, 내부 경로/없는 상품/이미지404, 미인증 게시설정401. 원본 상품을 임의 게시하지 않았다.
- 페이지 JavaScript 오류0. 주요 증거: `.local/wb87-popup-390-dark.png`, `wb87-popup-1440-light.png`, `wb87-publication-390-light.png`, `wb87-admin-save.png`, 나머지 고객12보기. root가 최종 목록 스타일 캡처를 별도 확인했다.

## 데이터·통합 확인
- `.local/wb87-baseline-hashes.json`과 `.local/wb87-final-hashes.json` 비교: 원본 products/skus/movements/product_images 전체행 해시 및 storefront.json 파일 해시 동일. schema13→14, 실제 product_publications 행0. 백업/추가테이블 이외 원본 업무 데이터 수정 없음.
- root 전체 웹92/92·전체 lint/typecheck 통과. 마지막 라벨 수정 이후 구현자 typecheck, root 해당 파일 lint 통과.
- 구현자 API256 회귀 및 후속67 통과 보고와 별도로 위 독립56개를 실행했다.
- 목록·등록/수정 URL 분리, 관리자 저장 결과/입력 보존, 고객용 공통 디자인 토큰·기본 접근성·모바일 기준을 확인했다.

## 한계·복구
실제 상품 게시·운영 판매는 수행하지 않았다. 고객 스크린샷은 합성 상품/작은 테스트 PNG 기반이며 실제 상품 촬영 품질 검증은 아니다. 실주문·결제·법적 고지 완결성·정량 부하·전체 스크린리더 검증은 범위 밖이다. 가격은 기존 원 표시 관례의 선택적 전시값이며 거래 가격/운영 국가 확정이 아니다.

schema14를 모르는 이전 코드는 그대로 실행할 수 없다. 필요한 후속 업무 데이터 보존/대사를 전제로 백업복원하거나14호환 수정으로 복구한다. 미커밋 기존 작업을 일괄 되돌리지 않는다. 커밋·푸시·배포 없음.

판정: 발견한 차단 결함 수정 후 독립 검증 통과. root 통합·문서 완료 판정 가능.
