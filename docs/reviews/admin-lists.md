# WB81 / R90 관리자 목록 간소화 검증

## 변경과 점검

| 화면 | 적용 또는 유지 근거 |
|---|---|
| 상품 목록 | WB79의 6열·카테고리 > 표기 유지 |
| 재고 현황 | 8→5열. 현재 수량/부족 상태 직접, 입출고 누계 펼침 |
| 입고/출고·조정 이력 | 입고 9→6열, 나머지 8→5열. 상품·옵션 및 변경량·변경 후 수량 묶기. 상세 사유/기록자/코드 펼침 |
| 카테고리/색상·사이즈 기준정보 | 각각 6→4열/5→4열. 이름과 코드 묶기 |
| 공급처 | 5→4열. 이름/영문명 묶기, 전화 직접 표시, 추가 연락처 펼침 |
| 공장 계정/시안 | 각각 5→4열. 이름/로그인 ID 및 상품/내부명 묶기 |
| 제작 요청 | 5열 유지. 제작 수량·기한·상태 모두 핵심 |
| 진열 관리 | 6→5열. 제목/유형 묶기, 부제목은 기존 수정 화면 |
| 작업 보드 | 제목/우선순위/담당 유지, 완료 기준·검증 근거 펼침 |
| 대시보드 | 재고 표의 보유/예약 묶기. 가용수량·부족 직접 표시. 샘플 표시 유지 |
| 기타 Q&A·상세 내부 목록 | 기존 간결한 목록/펼침·이미지 중심 표시 유지, 억지로 열을 제거하지 않음 |

변경 파일: catalog/catalog-list.tsx·catalog.css, category-manager.tsx, option-value-manager.tsx, suppliers/supplier-manager.tsx·supplier.css, factories/factory-admin.tsx·factory-admin.css, factories/progress/admin-progress.tsx·admin-progress.css, merchandising/merchandising-list.tsx, workboard/workboard-column.tsx·workboard.css, dashboard-view.tsx와 관련 문서. 프론트 경로는 apps/web/src/app/admin/(protected) 기준이며 구체 파일은 저장소에서 확인한다.

## 실제 실행 결과

- 독립 검증자 supplier_review: 웹 테스트 80/80, lint, typecheck 통과.
- 대표 관리자 28 URL × desktop/mobile·light/dark 112 조합, 24px 설정, 화면 넘침 및 펼침 키보드 조작 통과. 실행 결과 .local/wb81-review-results.json.
- 기준정보/공급처: 4열, 카테고리 >, 대표/담당 전화 직접 표시, 추가 연락처 Enter 펼침, 모바일·테마 통과. .local/wb81-catalog-list-browser.cjs.
- 공장 목록: 4/4/5열, 합성 25행 검색·필터·페이지 복귀·실제 상세/수정 링크 이동 통과. .local/wb81-factory-lists.cjs.
- 재고: 합성 55 SKU·165 이력, 5열/6 또는 5열, 누계·기록 상세 키보드, 20개 기본·10/50/100개 선택·마지막 15행, 검색/필터/보기 전환 초기화, 합계 110 유지, 55→8 축소 페이지 보정 통과. .local/wb81-inventory-browser.cjs를 구현자도 재실행하여 exit 0 확인.
- 발견된 카테고리 화살표 회귀 1건은 >로 수정 후 독립 재검증 완료. 남은 차단 없음.

조회 합성 응답을 사용했고 실제 업무 데이터 쓰기는 수행하지 않았다. 서버 계약·재고 계산·권한 변경이 없어서 API 회귀 테스트는 이번 작업에서 재실행하지 않았다. 모바일 표는 기존 영역 내 가로 스크롤이며 모든 열을 한 화면에 압축하지 않는다. .local 실행 산출물은 로컬 검증용이고 커밋 대상이 아니다.

## 완료·복구

등록/수정 화면과 저장 흐름을 유지한다. 새 의존성·DB 마이그레이션 없음. 복구는 이번 UI/문서 변경만 되돌리며 다른 작업 및 WB80 격리 준비 결과는 보존한다. 계획: docs/superpowers/plans/2026-10-27-admin-lists.md.
