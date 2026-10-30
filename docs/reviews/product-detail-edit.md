# WB95 / R100 상품 상세 편집 통합 검증

- 날짜: 2026-10-29. 구현 root, 독립 review_product_detail. 기준 HEAD 185d8cc 위 미커밋 변경.
- 목적: 별도 상품 수정 내용을 상품 상세 한곳에서 편집. 기본정보와 가격·할인·공개 설정을 상세 구역으로 통합하고 기존 두 edit URL은 인증 후 상세 앵커로 연결.
- 수정: catalog-forms.tsx, product-detail.tsx, catalog-manager.tsx, publication-editor.tsx, catalog-list.tsx, product-price.tsx, [id]/edit/page.tsx, [id]/publication/edit/page.tsx. 요구/결정/디자인/검증 템플릿/계획/작업 보드 갱신.
- API/DB/의존성/재고·가격 규칙 변경 없음. 기존 next-env.d.ts 로컬 변경은 별도이며 보존.

## 실행 증거
- 구현 전 `.local/wb95-browser.cjs`: 상세 #product-name 없음으로 timeout 실패 확인.
- `npm run typecheck`: 통과. `npm test`: 160/160 통과 (`.local/wb95-web-tests.log`).
- `npm run lint`: 전체 통과 (`.local/wb95-lint.log`), 후속 보완 후 catalog 디렉터리 ESLint 통과.
- `node .local/wb95-browser.cjs`: 실제 로컬 Next 앱/Edge 브라우저, 상품·가격 저장은 합성 응답 모킹. 실제 상품 DB 쓰기 없음. 최종 로그 `.local/wb95-browser.log`.
- 상세의 기본정보/가격 입력 존재, 각 저장 후 동일 URL 및 다른 구역 초안 유지, 기본정보 확정 응답으로 제목 갱신, 가격 중복 클릭 1회 요청 확인.
- 기본가와 동일한 할인가 저장 차단, 할인가 0원/100% 성공, 가격409 입력 보존·최신 버전 재조회 후 저장. 기본정보409도 입력 보존·재조회 후 저장 확인.
- 가격 저장 성공 후 catalog503: 완료 결과 유지와 별도 조회실패 표시. 결과 아래 재조회 후 복구 확인. 기본정보 초안 보존.
- 390px에서 두 저장 완료 제목 포커스 확인. 1440/390·light/dark·24px 글자에서 가로 넘침 없음. `.local/wb95-mobile-result.png`, `.local/wb95-mobile-editor.png` (시각 확인).
- 이전 /edit 및 /publication/edit가 상세로 연결, 목록에 입력폼 없음. 비인증 상세/두 edit URL은 로그인 이동. 상품별 리뷰 관리 링크 확인.
- 최종 테스트 과정에서 전역 메뉴와 상품별 리뷰 링크를 구분하지 않은 테스트 선택자 오류 1회 수정. 앱 결함과 구분하며 최종 실행에서 통과 확인.

## 독립 검증 및 보완
review_product_detail가 실제 diff, 타입 검사, git diff --check, 웹160 결과를 확인했다. 별도 390px Edge에서 두 구역 저장·초안 보존·완료 포커스·가로넘침·기존 URL 및 비인증 이동을 재현했다. 차단 결함 없음.
검토 지적: 상세 리뷰 직접 링크 복원, 가격 구역의 이전 상품명 중복 표시 제거, 요약 조회 실패 결과에서 자체 재조회 제공. 보완 후 통합 브라우저/타입/웹 회귀 및 대상 lint 확인. 409/503은 root 통합 테스트에서 검증했으며 독립 실행 범위에는 포함되지 않았다.

## UX/범위 및 복구
기본정보와 가격은 각 저장 버튼이 자신의 구역만 저장한다. API 원자적 전체 저장을 주장하지 않는다. SaveResult는 확정 응답 뒤 표시하고 계속 수정/목록/가격 이력 동작을 제공한다. 옵션·재고 요약은 해당 상품 문맥으로 유지하며 전체 상품 목록·원장을 입력에 추가하지 않는다.
실제 금액 변경·운영 DB 쓰기·배포·커밋/푸시 없음. 운영 빌드/백엔드 전체 테스트는 이번 프론트 통합에서 재실행하지 않았다. 서버 권한/금액 규칙은 기존 API 그대로이며 새 브라우저 테스트가 서버 검증을 대체하지 않는다. 복구는 이번 소스·문서 diff만 되돌리며 DB와 기존 사용자 변경을 보존한다.
판정: 독립 검토 및 통합 검증 완료.
