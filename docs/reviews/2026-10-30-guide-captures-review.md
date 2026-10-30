# WB115 / R110 화면 캡처 가이드 독립 검증

- 구현: root / guide_visual. 독립 검증: guide_review, 2026-10-30.
- 기준: `docs/superpowers/plans/2026-10-30-guide-captures.md` 및 현재 작업 파일. 커밋·배포는 범위 밖이다.
- 검토: `guide-view.tsx`, `guide-capture.tsx`, `guide.css`, `images/[name]/route.ts`, `admin-guide-captures.ts`, 기존 가이드 테스트.

## 1차 코드 검토

- 이미지 요청은 관리자 세션을 먼저 검사한다. JPEG basename 정규식과 manifest의 정확한 파일명 허용 목록을 모두 통과해야 한다. 입력 경로를 임의 파일 경로로 사용할 수 없다.
- 저장소 내 비공개 guide-assets 경로 두 곳만 조회하며, 인증된 응답에도 private/no-store 및 nosniff를 설정한다. 공개 이미지 최적화 경로를 사용하지 않는다.
- 확대는 native dialog의 모달 및 Escape 동작을 사용한다. 열 때 닫기 버튼 포커스, 닫기 이벤트에서 원래 확대 버튼으로 포커스 복귀가 구현되어 있다. 이미지 스크롤 영역은 키보드로 진입 가능하고 이름이 있다.
- 이미지 alt, 캡션, 표식의 텍스트 범례가 있다. 화면의 표식 번호는 aria-hidden으로 중복 읽기를 줄인다. 이미지 비율을 유지하며 모바일 확대에서는 원본 크기로 스크롤하도록 구성했다.
- 선택된 가이드 한 개만 렌더링한다. 검색 결과가 없으면 안내를 표시한다. 원문의 링크와 절차는 유지한다.

## 검토 의견

- 검색한 뒤 결과 업무를 선택하면 hashchange 처리의 `setQuery('')` 때문에 검색어와 필터가 지워진다. 검색 문맥 보존을 위해 hashchange에서는 선택 ID만 변경하도록 권고했고 root에 전달했다. 보안 차단 이슈는 아니다.

## 실제 실행

- `node --test apps/web/tests/admin-guide.test.ts`: 3개 통과, 0개 실패. 기존 원문 링크, ID, 관련 소스 및 관리 메뉴 커버리지 확인.
- `apps/web`에서 `npx eslint 'src/app/admin/(protected)/guide/guide-view.tsx' 'src/app/admin/(protected)/guide/guide-capture.tsx' 'src/app/admin/(protected)/guide/images/[name]/route.ts'`: exit 0.

## 아직 확인하지 않은 항목

- 1차 검토 당시 manifest는 빈 상태였고 캡처 검증 테스트는 생성 전이었다. 실제 캡처 내용, 표식 좌표, 10개 가이드 커버리지, 민감정보 제외 여부는 완성 후 확인한다.
- 실제 브라우저 인증 응답, 검색/선택/확대/ESC/모바일 렌더링은 root의 별도 검증 대상이다. 코드 검토를 실행 성공으로 표현하지 않는다.
- 읽기 전용 도움말이므로 저장 결과 피드백 및 목록/입력 분리는 해당하지 않는다. 업무 원문은 ADMIN_GUIDES를 재사용하며 별도 복제하지 않는다.

## 2차 자산 검증

- manifest 완성 후 `node --test apps/web/tests/admin-guide.test.ts apps/web/tests/admin-guide-captures.test.ts` 직접 실행: 총 4개 통과, 0개 실패(676ms). 10개 업무의 캡처 커버리지, 19개 단계 연결, JPEG 헤더·파일 실존·비공개 위치·좌표 범위를 확인했다.
- 18개 JPEG 전체를 `view_image`로 직접 열어 검토했다. 가이드용 합성 상품·리뷰·공장만 보였으며, 이미지에 실제 개인 이름·이메일·인증정보 노출은 발견하지 않았다. 이는 이미지의 육안 검토이며 원본 DB 분리 실행은 root의 기록을 참고한다.
- 상품 목록/상세/가격/옵션, 재고 목록/입고, 시안 목록, 공장 시안 목록/수령 목록, 진열 목록, 브랜드 소개, 메뉴 목록/편집, 리뷰 목록/편집/저장 결과, 내비게이션 캡처를 각 manifest 좌표와 대조했다. 가격 캡처의 y700 crop 기준도 일치한다.
- 검색 선택 시 검색어 초기화 의견은 root가 hashchange에서 setQuery 제거로 반영했고 변경 코드를 확인했다.
- P2 시각 표식 결함: `merchandising:1`의 첫 두 좌표는 숨김 checkbox의 1px 크기여서 실제 클릭 카드 대신 작은 점만 가리켰다. 이미지 1025×1000에서 실제 카드 영역은 대략 (24,465,992,76), (24,652,488,76)이다. root에 label/card의 bbox로 수정하도록 전달했다. 수치 유효성 테스트만으로 이런 의미상 표식 오류를 검출하지 못하므로 실제 캡처 대조가 필요하다.
- `next.config.ts`에 인증 이미지 route의 guide-assets JPEG 추적 포함 규칙을 확인했다. 실제 운영 standalone 산출물 실행은 미수행이다.

## 수정 재검증과 독립 판정

- root가 진열의 두 표식을 실제 카드 영역으로 수정했다. manifest를 다시 읽어 (2.341%,46.5%,96.780%,7.6%), (2.341%,65.2%,47.610%,7.6%)를 확인했으며 원본 JPEG 카드 영역과 일치한다. P2 표식 결함은 해결되었다.
- 수정 후 가이드 및 캡처 테스트를 다시 실행: 4개 통과, 0개 실패(550ms).
- 독립 코드·원문 연결·18개 이미지·좌표 검토 판정: 통합 검증 가능. 남은 차단 결함 없음.
- root가 진행하는 실제 모바일/검색/인증/확대 브라우저 결과는 이 독립 검토와 구분하여 통합 기록에 추가한다. 독립 검증자가 해당 브라우저 동작을 직접 실행했다고 주장하지 않는다. 운영 배포/standalone 실행/스크린리더 실사용은 미실행이다.
- 복구는 신규 guide assets/manifest/UI/이미지 route/trace 규칙을 되돌리는 범위이며 사용자 데이터 변경은 이 검토에서 수행하지 않았다.
