# WB37 관리자 전체 UI/UX 감사와 검증

요구 R47 / 계획 docs/superpowers/plans/2026-10-26-admin-ux-audit.md.
담당 inventory_ui 카테고리, inventory_api 기준정보, admin_ui 진열, 조정 담당 공통 manager·상품수정·문서, inventory_review 독립 검증.

## 전체 화면 감사

| 화면 | 판정·조치 |
|---|---|
| /admin | 샘플 업무 요약 읽기 전용. 목록 등록 폼 혼합 없음 |
| /admin/login 및 로그아웃 | 인증 동작/이동. CRUD목록 분리 대상 아님 |
| /admin/catalog | 상품·옵션 조회 목록 및 삭제 확인. 입력 폼 없음; 삭제는 행 제거/완료 안내 유지 |
| /admin/catalog/new | 별도 상품 등록과 기존 완료 패널 유지 |
| /admin/catalog/[id]/edit | 별도 수정 유지, 작은 알림을 SaveResult 완료 화면으로 교체 |
| /admin/catalog/options/new | 조합 입력·검토·완료. 선택 조합 표는 입력 데이터이며 전체 관리목록이 아님 |
| /admin/catalog/inventory 및 /new | 목록과 입력/완료 분리 유지 |
| /admin/catalog/categories | 입력 폼 제거, 목록과 대분류/세부 등록 진입 |
| categories/new 및 /[id]/edit | 별도 보호 페이지, 명시적 분류유형·부모선택, SaveResult |
| /admin/catalog/option-values | 색상/사이즈 목록과 등록·수정 링크만 |
| option-values/new 및 /[id]/edit | 별도 보호 페이지와 SaveResult |
| /admin/merchandising 및 /new,/[id]/edit | 섹션 목록과 개별 등록·편집을 분리; 전체문서 revision 저장 계약 유지 |
| /admin/workboard 및 /source | 읽기 전용 문서/보드, 입력 없음 |
| 톱니바퀴 글자 크기 | 로컬 즉시 적용 개인 설정. 선택 상태/화면 변화로 확인, CRUD목록 대상 아님 |
| 옵션 입력 중 기준정보 빠른 추가 | 전체 목록 없이 현재 입력 선택값 보완. 성공 항목 선택·닫기·포커스복귀 유지 |

대분류는 서버 parent_id:null로 이미 등록 가능했다. 혼란을 주던 세부 중심 설명과 숨겨진 상위 없음 선택을 명시적 유형/대분류 등록 버튼으로 교체했다. 서버 정책/스키마 변경 없음.

## 실행 증거

- root Edge 모의 API: 카테고리 목록 폼없음, root생성parentnull, child생성부모ID, 수정코드readonly·완료.409실패입력보존.
- 기준정보 목록폼없음/new/edit완료·자동포커스, 다른 색상 등록 포커스. 상품수정완료/계속수정값·포커스 확인.
- 네 신규 카테고리/기준정보 URL 미인증 로그인 리다이렉트. 입력 화면에전체table없음.320/390px 상품수정 및 카테고리/기준정보 목록·신규6경로 전체가로넘침없음.
- .local/admin-ux-audit-browser.cjs 최종 exit0. 성공쓰기모의만사용.
- 독립 리뷰에서 기준정보 추가등록 포커스와 갱신중버튼상태 결함 발견, 수정 후 재실행 통과.
- 독립 웹48개·lint·typecheck·프로덕션 빌드 통과. 카테고리/기준정보/진열 신규·수정6개경로 포함 확인. 남은 차단 이슈 없음.

- admin_ui Edge 모의API(.local/wb37-merchandising.cjs): 진열 목록폼없음/new·edit전체목록없음, 등록/수정/삭제 SaveResult·포커스·목록복귀,422입력보존, 불확실저장 후 최신조회게이트와 조회실패/성공복구, 타섹션전체배열보존,390px 및 신규URL미인증리다이렉트. 모의PUT5회/실제쓰기0회.

## 제한·복구

모든 관리 URL/쓰기 컴포넌트는 소스로 감사했으며 브라우저 실측 범위는 위 증거로 한정한다. 실제기기/전체보조기술 검증은 미수행. API/DB불변으로전체API테스트반복안함. 기존자료를삭제하지않고이전코드로복구가능. 커밋/푸시/배포없음.


