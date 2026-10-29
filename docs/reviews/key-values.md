# WB77 / R87 핵심값 위계 검증

- 구현: root KeyFacts 공통표현, 옵션 현재값/확정결과, 상품상세 요약/표, 디자인시스템.
- 변경: 숫자 크기·굵기·tabular, 상태배지, 변경전/저장후 라벨, 보조정보 위계, 의미토큰/간격/모바일1열.
- 데이터/API/계산/권한 변경없음. 기존 SaveResult 포커스와 저장 확정 snapshot 유지. 화면별 입력/조회 분리 유지.
- git diff --check 통과(기존줄바꿈 경고), 작업보드5/5 통과.
- supplier_review 독립 lint/type exit0. .local/wb77-hierarchy-review.cjs 모의 브라우저 통과: 편집/완료/상품상세 ×1440/390 ×light/dark 및 글자24px, 핵심3카드·모바일1열·가로넘침없음·값폰트>라벨 검증. 409 입력보존/완료포커스/전후표시/저장후조회실패결과유지/재활성/실제수량불변 회귀검증 통과.
- .local/wb77-option-settings-saved.png 검증자 모바일 시각확인, .local/wb77-option-settings-desktop.png root 시각확인. 카드별 현재값·변경전/저장후·재고불변 구분 확인.
- 데이터변경 없는 표현개선이므로 API 전체시험은 재실행하지 않았다. 브라우저 저장은 모의요청, 실제 DB 쓰기 없음.
- 통합 판정: 완료(root).
- 복구: 해당 UI/CSS 변경복원, 데이터작업 없음.
