# WB46 공급처 상세정보 검증

2026-10-26 / R56. 구현: inventory_api(서버), inventory_ui(UI·계약), 조정(통합·문서). 독립 검증: inventory_review.

## 결과

영문명·대표자·대표전화·사업자번호·담당자/전화·이메일·우편번호/주소/상세주소·메모를 추가했다. 공급처명 외 상세값은 선택이다. 폼을 세 그룹으로 나누고 공통 간격/다크 토큰을 사용한다. 목록은 이름·영문명·대표자/전화·담당자 요약을 제공한다. 저장 성공은 공통 완료 패널, 실패는 입력 유지, 수정 진입은 상세값 복원을 제공한다.

서버 PUT에서 누락 상세값을 보존하고 명시 빈 문자열로만 비운다. 이름 snapshot과 원장·재고·version은 유지한다. 전화·이메일 검증은 기본 입력 검증이며 실소유 확인/사업자 인증이 아니다.

## 검증

- 독립 API 221개 통과. 상세값·경계·null·누락/clear·권한·충돌·스키마 이관·부분실패 rollback 포함.
- Edge + 모의 쓰기: 11개 필드 전송, 422 시 입력 보존, 등록/수정 완료, 목록 요약, 수정 복원, 메모 명시 삭제 확인.
- 390/1280px, light/dark, 확대 글꼴에서 문서 가로 넘침 없음. 그룹 gap24px 이상, 필드 gap16px 이상 확인 및 시각 확인.
- 실제 schema7 반영 후 백업과 suppliers/products/skus/movements의 모든 이전 컬럼을 비교해 동일 확인. FK 및 integrity_check 통과. 실제 데이터 테스트 쓰기는 하지 않았다.
- 브라우저 첫 실행은 Next route announcer와 일반 alert의 중복 선택으로 검증 스크립트가 중단됐다. 실제 오류 요소로 선택자를 구체화한 재실행에서 전체 시나리오 통과.
- 독립 검토에서 Python/JS Unicode 길이 계산 차이를 발견해 코드 포인트 기준으로 보완하고 이모지 경계 회귀 검증 통과. 최종 웹58개·lint·typecheck·production build 모두 통과. 작업 보드 파서5개 통과.

## 범위·복구

services/api/app/inventory.py·테스트, catalog.ts·suppliers.test.ts, supplier-manager.tsx·supplier.css 및 문서. 실제 개인정보 사용·외부주소검색·사업자인증·운영연동·전체 접근성 감사는 수행하지 않았다. 백업 .local/catalog-before-v7-20261026-131144.sqlite3로 복구할 때 서버를 중지하고 호환코드와 함께 복원하며 백업 후 새 기록이 있으면 먼저 보존한다.

