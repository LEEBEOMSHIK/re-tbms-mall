# WB67 / R79 시안 상세 검증

- root: 요약 공장명 링크, 중복버튼 제거, 시안상세 제목/이미지영역/saved_image 전달. supplier_ui: ProductImages scope와 업로드종류·복귀. supplier_review: 독립 코드 검토 및 전체 lint exit0.
- 타입검사 exit0(담당 및 최종 통합).
- 실제 Edge/로컬 Next + 이미지 API 모의: 상품상세 링크1개/버튼0개, 내부이미지 없음·모델 이미지 있음; 공장링크 시안상세 이동·내부이미지만 표시. 내부업로드503 실패 입력보존, 재시도 성공 receipt와 시안상세 복귀. 고객용 종류에서 design 제외·취소 상품상세 복귀. 미배정 링크와 상세설정 접근 확인.
- 1440/390 × light/dark 4조합 가로넘침 없음, 모바일 캡처 검토. .local/design-detail-browser.cjs 및 design-detail-1440.png/design-detail-390.png는 로컬 검증 산출물.
- 실제 이미지 쓰기/삭제 없음. API/DB/공장권한 변경 없음으로 API전체·실제파일서버 연동 재실행하지 않음. 고객용 성공업로드는 이번 브라우저에서 반복하지 않았으며 기존 경로/코드 독립검토.
- 변경 파일: product-progress.tsx/css, factory-admin.tsx, progress/admin-progress.tsx와 [id]/page.tsx, catalog/product-detail.tsx/product-images.tsx/[id]/images/new/page.tsx, 관련 문서.
- 복구: 위 UI와 범위별복귀 변경만 되돌림. 데이터 이동/마이그레이션 없음.
