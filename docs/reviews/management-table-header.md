# WB99 / R103 관리 표 헤더 구분

- 요청: 목록 짝수 행과 헤더를 구분하고 디자인 시스템에 반영.
- 목적/범위: 공통 management-lists.css에 헤더 전용 배경·구분선·굵기 토큰 적용. 관리자/공장 모든 thead 셀, 고객 화면 제외.
- 담당: root 구현·통합 / 독립 검증 별도.
- 계약: 행 줄무늬·선택/경고·정렬·페이지네이션·API/DB 변경 없음.
- 기준: 헤더 text10%+surface90%, 짝수행 subtle70%+surface30%, 하단2px 및 weight600. 기존 thead 셀 스타일보다 우선 적용.
- 수정 파일: management-lists.css, docs/design-system.md, docs/design-system-admin.md, requirements/decisions/workboard, 본 검증 기록.
- 수용: 실제 여러 표의 light/dark에서 헤더/짝수/홀수 배경이 모두 다름. 2px 하단선·600 굵기 확인, 공장·고객범위 보존. 문서의 이전 기준 정합성 정리.
- 검증: 아래 통합/독립 결과 참고.
- 복구: 헤더 CSS/토큰만 복원하고 WB98 및 이전 미커밋 변경 보존. 데이터/의존성/운영 변경 없음.

## 통합 검증 실행
- `.local/wb99-browser.cjs` 통과, 로그 `.local/wb99-browser.log`. 데이터 있는 관리자7종 표 양 테마에서 thead 배경 != 짝수행 배경, 하단2px/weight600 확인. 홀수/짝수·선택상태·헤더 행·고객 미적용·모바일 회귀 유지. 리뷰/발송 빈목록은 실제 행 검증 없음.
- PC 라이트 `.local/wb99-light.png`, 모바일 다크 `.local/wb99-mobile-dark.png` 캡처. PC 실제 헤더와 줄무늬 시각 확인. git diff --check 통과.
- CSS/문서 변경이므로 앱 전체 테스트/빌드/백엔드 검증 재실행하지 않음. 실제 업무 데이터 쓰기 없음.
- 독립 review_product_detail: 관리자 카테고리/재고·공장 상품/제작요청4표×light/dark의 헤더36셀 검증, 배경·2px·600/우선순위·고객격리·공장390px 통과. 공통/관리자 디자인 현행 기준 일치. 지적한 requirements R102의 이전 헤더 유지 문구도 R103 참조로 수정.
- 판정: 독립 및 통합 검증 완료.
