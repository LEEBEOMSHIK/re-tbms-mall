# WB216 / R107 옵션별 초기 재고 입력 통합
- 사용자 승인: 표 중심 입력, 공통입력 접힘/복수 신규옵션에서만 표시, 최종 수량 합계와 등록 동작 구별.
- 담당 root / 독립 검증. 범위 catalog-forms.tsx/catalog.css, 가이드 catalog·캡처, 디자인시스템·보드.
- 계약: initial_stock/reorder_point 및 selected-batch API 유지. 공통값은 현재 신규·미제외 행만 대체하며 실제 저장 안 함. 기존 SKU 읽기전용 유지.
- 수용: 신규1/복수/기존/제외 조합, 개별/공통입력 합계·실패보존, PC1440/390/320·가이드 확인. 기존 선택배치 계약 테스트 실행.
- 복구: UI/문서 변경만 복원. 로컬 실제 재고 변경하지 않음.

## 결과 (2026-11-06)
- PC1440/390/320: 신규1 공통입력 없음, 복수 기본접힘, 개별7→공통10씩/총20, 부족기준3 별도 적용, 저장 전 POST0 확인. 합성422 입력보존→합성성공 SaveResult 확인. 실제 로컬 재고 쓰기 없음.
- hold_ui 독립1440/320: 1기존+3신규로 합계/제외/복원 검증. 기존17/기준4 유지, 제외행 보존, 재고/부족기준 영향분리, Enter/Space·문서넘침0 통과. 첫 합성fixture 참조 누락은 테스트 스크립트 수정 후 재통과.
- 타입·수정파일lint·관련 웹15·서버 selected-batch24 통과. 서버는 별도 임시 DB, UI 저장은 합성 응답. API 계약 변경 없음.
- 가이드 catalog에 수량입력단계 추가, catalog:3 새 private catalog-quantities.jpg/표식 생성, 기존 가격단계 catalog:4로 이동. 시각 확인.
- 증거 .local/wb216-table-1440.png, wb216-footer-1440.png, wb216-table-320.png, wb216-guide.png, wb216-independent.cjs.
- 복구는 위 문서 범위의 UI/가이드만 복원. 완료, 후속은 사용자 요청에 따름.
