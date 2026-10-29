# WB74 / R84 검증 (2026-10-27)

- 구현: root 목록/BFF/신규등록안내, supplier_api API, supplier_ui 별도수정화면. 독립검증 supplier_review.
- 변경: inventory.py/main.py/test_reorder_point.py; reorder-point-editor.tsx 및 inventory/[id]/threshold/edit/page.tsx; api/admin/skus/[id]/reorder-point/route.ts; catalog-list.tsx/catalog-forms.tsx; 관련문서.
- API 신규16+기존회귀 총74 통과. 독립 focused16 통과. 버전충돌/인증/경계값/재고원장불변. 격리DB사용.
- 최종타입·독립전체lint 통과. 로컬8100 OpenAPI에서 신규경로 확인(읽기전용).
- 실제브라우저+모의쓰기: 필터재고목록→수정→409입력보존/재조회gate→성공→SaveResult 전후기준/실제재고불변→목록 복귀. 입력화면 전체table/이력없음, 목록에 수정input없음. 직접URL로그인차단/BFF401·Origin403 확인.
- 390px 완료제목focus/scroll 및 넘침없음. 성공후GET503에도 저장결과유지, 재조회성공의 현재값안내. 신규옵션대상0 공통입력disabled/기존수정진입 확인. .local/reorder-edit.cjs 및 reorder-saved-mobile.png.
- 초기브라우저는 Next route announcer와 alert선택자 중복으로 중단, 오류문구로 한정 후 재실행통과. 실행인자누락1회도 수정후재실행. 실제사용자SKU변경없음.
- 쓰기UX: 서버확정 snapshot/후속동작/모바일포커스/실패보존/성공후조회실패 모두 확인. SaveResult 적용.
- 목록·입력분리: 재고현황→별도수정URL→완료→필터목록. 옵션요약은 수정대상만이며 전체목록아님. 기존신규등록빠른기준정보폼은 이번변경범위밖.
- 실제로컬재고변경·운영·전체빌드 미실행. API격리검증과 UI모의결과를 구분. 복구시route/UI/API변경만복원; 이미저장된기준값을 임의원복하지않음.
