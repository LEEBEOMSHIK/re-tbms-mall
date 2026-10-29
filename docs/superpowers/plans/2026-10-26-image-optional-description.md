# WB73 / R83 이미지 입력 간소화

- 목적: 시안종류 고정선택 제거, 이름필수/설명선택.
- 담당: root UI·문서, supplier_api API/tests, supplier_review 검증.
- 계약: design종류필드 숨김, customer model/garment선택 유지; alt 요청누락/빈값 허용·응답문자열/최대240, name필수120. 설명없으면 렌더링 alt는 이름대체.
- 수용/검증: 빈설명저장/조회/재시도, 이름필수·길이거부, 기존분류유지, 브라우저.
- 복구: UI/API검증을 함께 이전으로 복원하되 새빈설명자료 읽기호환성 유지. DB변경없음.
