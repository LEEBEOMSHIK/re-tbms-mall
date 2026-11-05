# WB160 로고 자료 등록·교체·게시 검증

- 요구: R108. 담당 root, 별도 검증 brand_identity_review. 2026-11-02.
- 범위: 관리자 상태/편집/미리보기 별도 URL, PNG 원본 업로드·교체·초안 저장·게시. 공장 최신 게시본만 조회/다운로드. 기존 WB159 자산 보존.
- 변경 파일: API brand_library.py/main.py/초기PNG3종/관련테스트, 웹 brand-library-manager·공통뷰/CSS/계약/BFF/양측routes, admin.css 모바일행높이, docs/contracts/brand-library.md, 디자인·결정·요구·가이드·보드.

## 실행 결과
- API `pytest tests/test_brand_library.py -q`: 4 passed. 합성 임시 DB로 무인증·역할교차·공장 비활성401, 미게시/이전공개원본404, 초안분리, 바이트동일, 재시작보존, 잘못된 파일/상한/중복/빈값, 동시 revision 200/409.
- 웹 `node --test tests/brand-library.test.ts tests/admin-guide.test.ts tests/admin-guide-captures.test.ts tests/admin-navigation.test.ts`: 11 passed. 계약응답 제한·파일참조검증·초기PNG일치·가이드경로/좌표/이미지치수 검증.
- 웹 typecheck 및 변경 TypeScript ESLint 통과. git diff --check 공백오류 없음.
- 실제3100 BFF: 별도 테스트세션으로 익명401, 외부 Origin PUT/게시/업로드403, 과대본문422, 잘못된입력422, 다운로드 attachment/no-store/원본바이트일치. 근거 `.local/wb160-bff-check.py` (키/쿠키 출력 없음). API 재시작 후 동일 검증 통과.
- 실제 브라우저: 관리자 원본 logo_long.png 업로드(동일 바이트의 새 자산)→모바일 초안저장 revision1→미리보기→게시v2→완료→자료실 복귀. 공장 테스트계정으로 v2·3종 조회/이미지로드, 편집버튼 없음, PC1440·모바일390 확인.
- 충돌: 별도 테스트세션에서 내용동일 저장 후 브라우저 옛 revision 제출409. 입력 유지/alert 포커스 확인→최신상태 확인→같은 입력 재저장 revision4 성공/SaveResult 제목포커스. 게시본은v2 유지, 초안과동일.
- 모바일390 저장/게시완료, 320 편집 입력영역 가로넘침없음. 짧은완료화면에서 헤더가늘어나는 원인을 grid행크기로 수정. 게시완료 동일URL복귀 처리 수정 후 실제목록 복귀 확인.
- 가이드 brand 4~6 단계 업데이트, brand:4 실제사진/등록·게시표식 갱신. `/admin/guide` 확대 시 두 표식과실제버튼 일치, 편집링크 이동 확인. 기존 시작가이드의 PC레이아웃/표식은 영향 없음(모바일 짧은페이지행높이만 변경).

## 캡처
`.local/wb160-admin.png`, `wb160-editor.png`, `wb160-admin-mobile.png`, `wb160-editor-mobile.png`, `wb160-save-mobile.png`, `wb160-published-mobile.png`, `wb160-conflict-mobile.png`, `wb160-factory.png`, `wb160-factory-mobile.png`, `wb160-guide.png`.
가이드 정식자료는 `apps/web/guide-assets/brand-library.jpg` 및 `apps/web/src/lib/admin-guide-captures.ts`.

## 제한·복구
운영 배포/운영 이미지/실제 공장 사용자 로그인은 실행하지 않음. 로컬 합성 공장 계정으로 검증. PNG만 지원하며 벡터·인쇄승인 별도. 기존 public 로고는 소급 비공개되지 않음. 자료실 게시로 고객 헤더를 자동 변경하지 않음. 업로드·게시분리 서버자료는 `.local/brand-library.sqlite3`에 보존. 이전 원본을 관리자 파일선택에서 골라 초안저장/게시하여 복구, 원본삭제 없음. 커밋·푸시 미실행.

## 독립 확인
brand_identity_review가 코드·API4·웹계약4·가이드4를 독립 실행/검토하고 실제 캡처5장을 시각 확인. 차단사항 없음. 브라우저 조작은 root 수행, 별도 검증자는 제공 캡처와 코드/테스트를 검토했다. 초기원본 API패키징과 DB경로 분리 보완 완료.
