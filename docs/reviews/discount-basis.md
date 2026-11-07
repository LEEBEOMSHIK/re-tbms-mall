# WB212 검증 결과 — 할인 기준 선택

- 요구 R107 / root 구현 / hold_ui 독립 검증 / 2026-11-06.
- 수정: API public_catalog.py·inventory.py, 웹 pricing.ts·publication.ts·publication-editor.tsx·product-price.tsx·catalog.css, 할인 테스트 및 기존 마이그레이션 최신버전 기대값, 가이드 catalog 원문·catalog:3 캡처/표식, API·결정·디자인 문서/보드.
- 계약: discount_mode 및 discount_percent를 서버 확정 저장. v18 추가 마이그레이션 전 v17 백업. 기존 판매가/이력/재고 보존. 고객 가격 DTO와 주문/재고 계약 유지.
- 전체 API731 통과(240.04초); 웹249 통과; 타입 검사와 수정 파일 ESLint 통과. ESLint 첫 실행은 루트 경로에서 설정을 못 찾아 실패했고 apps/web에서 재실행 통과. 제한 환경 API 실행은 무출력으로 중단, 권한 있는 테스트 환경의 임시 DB에서 재실행.
- 별도 독립 API18 통과. int 버림·1/100%·기본가 변경·기준 전환·권한·422 무변경·409 충돌·v17 백업/v18 반복 호출 확인.
- 실제 Chrome UI PC1440/390/320: 30001원@20%=24000원, 기본가40001→32000, 101% 차단/포커스, 합성422 입력 유지, 재조회 후 성공, 저장 성공/요약 조회 실패 구분, 계속 수정 포커스, 재진입 기준 유지. 저장 응답은 브라우저 라우트 합성, 실제 서버 저장은 임시 DB API 테스트로 검증. 기존 실제 상품 가격 쓰기 없음.
- 독립 PC1440/320 GET-only UI: 0/101/1.5 오류, 100%=0원, 판매가25000 유지, 넘침 없음 통과.
- 현재3100 publication GET 신규 기준 필드 확인(실제 서버). 가이드 인증 화면 캡처/표식 시각 확인.
- 증거: .local/wb212-percent-1440.png, .local/wb212-percent-390.png, .local/wb212-percent-320.png, .local/wb212-guide.png, .local/wb212-ui.cjs, .local/wb212-independent.cjs.
- 미구현/제한: 소수 할인율은 지원하지 않음. 실제 PG 없음. 운영 배포/커밋/푸시 미실행.
- 복구: 서버 중단 후 pre-v18 백업 복구(백업 이후 데이터 별도 보존)와 해당 변경만 복원. 이전 미커밋 작업 보존.
- 통합 판정: 완료. 후속: 사용자 요청에 따라 진행.
