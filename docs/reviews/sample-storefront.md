# WB90 실제 샘플 상품 전시

- 요구: R96/R97. 사용자 요청에 따라 상품 하나를 로컬 고객 홈·목록·상세에 연결해 확인한다.
- 담당: root 데이터 설정·통합, public_catalog_review 독립 브라우저 검증.
- 범위: 기존 API로 샘플 생성·이미지 업로드·옵션 생성·명시적 게시·홈 컬렉션 연결. 앱 코드/스키마 변경 없음.
- 계약: `docs/contracts/public-catalog.md`. 기존 고객용 garment 이미지 경로와 게시 준비 조건 사용.
- 상품: `[샘플] 에센셜 크루넥 티셔츠`, ID `9223bc86-b527-4ece-91fd-7a4153a9dd8d`.
- 데이터: 빨강/스몰 테스트 수량8, 빨강/미디움0, 부족 기준2. 기존 상품·SKU 변경 없음. 선택 가격은 null로 유지.
- 이미지: imagegen으로 만든 합성 티셔츠 정면1장. 업로드 용량 제한 때문에 원본 PNG에서 WEBP로 인코딩 후 등록했다. 실제 상품/소재/실측을 보증하지 않는 샘플임을 상품 설명에 표시했다.
- 홈: 기존 진열 구성을 보존하고 `sample-edit` 컬렉션을 앞에 추가했다.
- 수용 기준: 홈 카드→상세, 목록→상세, 실제 이미지 응답, 옵션 재고/품절, 모바일·다크·확대, 기존 데이터 보존.
- 실행 근거: `.local/wb90-setup.cjs`, `.local/wb90-before.json`, `.local/wb90-setup-result.json`. 기존 상품/SKU JSON 동일성 확인 통과.
- 독립 UI 검증: 통과. 실제 공개 API 응답(mock 없음)으로 홈·목록·상세 1440/390px, 실제 WEBP 로드(complete=true, naturalWidth=1086), 스몰 재고 있음·미디움 품절, 상세 다크/24px 확대를 확인했다. 예외 0건, 검증자 쓰기 요청 0건, 가로 넘침 없음. 근거: `.local/actual-public-review.json`, `.local/actual-public-{home,list}-{1440,390}-loaded.png`, `.local/actual-public-detail-dark24-390-top.png`. 최초 홈 캡처의 이미지 로딩 전 빈칸은 완료 대기 후 재캡처로 교체했다. fullPage 캡처에 나타난 skip 링크는 스크롤 중 고정 요소 캡처 현상으로, 실제 viewport rect top=-100/bottom=-40·비포커스 상태를 확인했으며 앱 결함으로 판단하지 않았다.
- 복구: 관리자에서 해당 상품을 게시 중지하고 진열의 `sample-edit` 섹션을 제거한다. 테스트 재고 이력은 보존한다. 전체 DB 복원은 이후 변경을 잃을 수 있으므로 사용하지 않는다.
- 남은 범위: 실제 판매용 상품 사진·가격·소재·실측·배송/교환 정책은 미확정. 주문/결제는 추가하지 않았다.

