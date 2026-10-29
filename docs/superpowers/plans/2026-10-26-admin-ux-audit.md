# WB37 관리자 전체 화면 구조·저장 UX 감사

R47 / 2026-10-26. 전체 admin route/쓰기UI를 점검한다. 카테고리·색상/사이즈 기준정보 목록/new/[id]/edit를 분리한다. 대분류는 서버parent_id:null 지원하며 화면유형과별도등록진입을명확히한다. 상품수정완료도SaveResult로적용. 진열관리 구조는 전체설정편집인지 목록CRUD인지 확인하고 결과에맞춰분리/완료UX적용. 로그인/로그아웃·로컬사이트설정·대시보드·읽기전용작업보드는CRUD목록예외로근거기록.

계약: CatalogManager mode category-new/category-edit,option-value-new/option-value-edit + entityId/categoryKind/optionKind. CategoryManager mode list/new/edit+categoryId/categoryKind. OptionValueManager mode list/new/edit+valueId/initialKind. 신규보호routes. 기존API/데이터변경없음. 빠른추가는입력문맥기준값추가 예외로기존선택즉시반영유지.

담당: inventory_ui카테고리,inventory_api기준정보,admin_ui진열,root공유manager/상품수정/문서통합. 완료후별도inventory_review검증. 선행WB36. 수용: 목록폼없음/폼전체목록없음/대분류root등록·child필수부모/완료·실패·충돌·복귀/인증/모바일/새라우트빌드. 합성/모의검증만쓰기. 복구코드되돌림,데이터삭제없음.
