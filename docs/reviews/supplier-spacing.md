# WB44 공급처 목록 간격 검증

2026-10-26 / R54. 구현: 조정 담당, 독립 검증: inventory_review.

원인: catalog-actions gap은 내부 버튼만 대상으로 하고 일반 block인 목록 패널의 문단은 margin reset으로 서로 붙었다. 공급처 목록에 opt-in catalog-list-stack(space-4)을 적용하고 안내문과 빈 상태를 분리했다. 빈 상태는 space-6 padding을 사용한다. 등록·수정 fieldset은 변경하지 않았다.

Edge 브라우저에서 빈 목록·데이터 목록, 390/1280px, 루트 글꼴 16/24px 각 조합의 요소 bounding box를 측정했다. 버튼→안내→결과 간격이 CSS space-4 이상이며 문서 가로 넘침이 없었다. 등록·수정 fieldset gap 유지 확인. 합성 조회만 수행하고 실제 데이터는 변경하지 않았다. 확대 글꼴 화면도 시각 확인했다.

독립 소스 검토: 영향 범위가 목록으로 제한됨을 확인. lint/typecheck 모두 exit 0. 작업 보드 파서도 통과했다. 서버·업무 로직 변경이 없어 API 테스트·전체 빌드는 반복하지 않는다. 변경 파일: supplier-manager.tsx, catalog.css, 디자인·요구·계획·작업 보드. 복구는 해당 opt-in 클래스와 CSS 제거.

