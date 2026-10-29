# WB73 / R83 검증

- root: design 종류필드 숨김/customer선택유지, 이름required·설명optional, parser 빈설명허용, 관리자/공장 이미지alt 이름fallback. supplier_api: alt default 빈문자/max240, 관련API테스트.
- 타입검사 통과. 최초 숨긴분기 disabled scope비교 TypeScript 오류를 제거하고 재실행 통과. 웹이미지 parser2개 통과.
- API28개 통과 --basetemp=.pytest_cache/wb73-api: 빈값/누락/공백/240자 저장조회재시도, 이름필수/길이·altnull/초과거부. 실제DB쓰기없음.
- Edge 모의API: design종류없음·설명optional·이름필수, 빈이름submit안됨, 설명없이등록/시안상세복귀/이름대체텍스트, 고객용종류유지 확인. .local/optional-description.cjs. 실제 업로드없음.
- supplier_review 독립 전체lint exit0, API28개 재검증 통과, 권한/필수값/대체텍스트 코드검토 차단없음. 전체API/빌드는 반복하지 않음. DB/API경로/공유권한변경 없음.
- 복구시 새 빈설명 데이터 읽기 호환성을 유지해야 함.
