# WB114 / R110 관리자 사용 가이드

사용자 요청: 내부 사용 가이드 메뉴와 업무 순서 안내, 기능 변경 시 관련 가이드 동기화.
담당: root UI/문서/통합, guide_content 원문/링크 검증, 독립 reviewer.
원문 단일 위치 apps/web/src/lib/admin-guide.ts. 가이드 상태를 보드와 중복 관리하지 않고 절차/검증일만 담는다.
데이터 계약: ADMIN_GUIDES: {id,title,summary,updatedAt,prerequisites:string[],steps:{title,description,href?:string,linkLabel?:string}[],completion:string,notes:string[],relatedPaths:string[]}[]. 사용자관리·상품등록/공개·SKU재고·시안·공장협업/수령검수·홈진열·브랜드소개·메뉴관리·리뷰·문제해결. 미정 정책을 확정하지 않는다. href는 실제 고정 관리자경로, 동적ID 예시는 목록으로 안내.
UI: /admin/guide 보호된 읽기전용 페이지, 검색/목차/순서/완료확인/주의 및 관련화면 링크. API/DB/권한 변경 없음. sidebar 하단 사용가이드 고정링크(전체숨김에서도 도움말 접근; 레지스트리8개 설정보존). 모바일1열, 디자인토큰, semantic ol/headings.
수용: 관리메뉴/직접URL 인증, 현재 기능·경로·절차 일치, 검색 빈상태/모바일/키보드, 원문 단일관리 및 변경시검증규칙.
변경: admin-guide.ts/tests/admin-guide.test.ts, protected/guide/**, admin-navigation.tsx, AGENTS.md, docs/development-process.md/templates/task.md/templates/review.md/requirements.md/decisions.md/design-system.md/design-system-admin.md, workboard.md.
검증: 링크와 relatedPaths 실존/ID중복/날짜/본문비어있음/메뉴커버리지, 타입/lint, 실제데스크톱/모바일검색/직접URL, 별도코드·내용 검증.
복구: 이번 guide 및 navigation링크 제거. 기존 설정/DB/사용자데이터 불변. 새 의존성·커밋·배포 없음.

- [x] 관련 관리 화면의 실제 코드에서 문구/절차 확인하고 원문 작성
- [x] 보호된 가이드 화면 및 항상 접근 가능한 링크 구현
- [x] 작업규칙/템플릿에 관련 가이드 갱신·영향없음 사유 기록 필수화
- [x] 링크/원문/타입/브라우저 및 독립검증 후 보드완료
