# WB81 / R90 다른 관리자 목록 간소화

- 목적: WB79 연속 UI개선으로 관리자목록의 열/반복정보를 줄이고 핵심값을 직접보이게한다.
- 담당/파일: root catalog-list/css·dashboard·merchandising·workboardUI/공통문서, supplier_ui category/optionvalue/supplier목록, supplier_api factory목록, supplier_review 독립검증. WB80 별도독립작업 공간준비/지침은 수정하지않고 현재UI 연속작업을 진행한다.
- 계약: API/계산/권한/저장/데이터변경없음. 검색·필터·페이지크기·첫페이지리셋 유지. 이름/현재재고/상태/변동량/기한은직접표시, 코드/누계세부/상세사유/기록자는동일셀 또는 키보드접근가능한 읽기전용details로 제공. 이미존재하는 상세/수정URL에 연결가능하나 접근경로없이 삭제하지않음.
- 범위: 재고8→5열/이력9→6(입고),6→4분류/5→4기준정보/공장계정/시안,공급처연락처그룹,진열6→5,작업카드근거접기. 기존제작요청5열/Q&A details등충분히간결한목록유지사유기록.
- UI: 표행세로중앙/핵심수치강조/관리작업유지/모바일표영역스크롤, details는단순조회보조내용이며 작성폼추가금지.
- 검증: 독립lint/type/webtests, 실제목록모바일/desktop light/dark24와details키보드/검색·필터·페이지리셋/정확ID링크. 데이터없는목록은합성GETfixture. 실제쓰기차단.
- 복구: UI변경복원. DB/운영변경없음. WB80와문서동시편집은최신파일재읽기후WB81항목만변경한다.
