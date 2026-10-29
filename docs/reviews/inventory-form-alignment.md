# WB51 / R61 재고 입력 정렬 검증

- 구현: supplier_ui catalog-forms.tsx/catalog.css. 독립검증: supplier_review. 통합: 조정.
- 공급처 입력그룹/보조작업 버튼 스타일 통일, 소개/이력 그룹간격, 처리사유 필드그룹화. 옵션 표시 한줄과 수량 높이 정렬, 전체정보 dl+aria-describedby 제공. 공통 FormSelect 및 업무/API는 변경하지 않음.
- Edge .local/inventory-form-alignment-browser.cjs: 입고/고객판매/기타3흐름 ×1440/768/390 ×라이트/다크 확대글꼴 총18조합 통과. 선택/수량 높이 차이2px미만, 데스크톱 상단위치 동일, 공급처 버튼 높이동일, 가로넘침 없음. 긴전체코드 상세 노출·모바일상세1열·새로고침 후 옵션/수량10 유지 확인.
- 첫 실행 합성데이터의 과거이력→삭제한SKU 참조 때문에 파서가 거부해 폼대기 실패. 테스트 fixture의 movements를 비운 뒤 재실행 두차례 통과. 실제데이터 변경 없음.
- .local/inventory-form-alignment.png 다크 확대 화면 렌더링 확인.
- 독립 웹66개·lint(경고0)·type exit0, 차단결함 없음. git diff --check exit0.
- 새 비즈니스정책/의존성/DB변경 없음. API/운영빌드는 표시변경 범위에서 재실행하지 않음. 복구는 이번 JSX/CSS 변경만 되돌리며 기존 미커밋작업 보존.
