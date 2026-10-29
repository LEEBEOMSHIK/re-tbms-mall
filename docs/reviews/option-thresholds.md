# WB34 조합별 재고 부족 기준 검증

R44 / docs/superpowers/plans/2026-10-26-option-thresholds.md. API inventory_api, UI inventory_ui, 계약/문서 조정 담당, 독립 inventory_review.

변경: inventory.py·test_selected_sku_batch.py, catalog-forms.tsx·catalog.css, lib/catalog.ts·selected-sku-batch.test.ts, 요구/API/결정/디자인/보드. DB스키마 변경없음.

## 확인한 증거

- 독립 웹46개·lint·typecheck·프로덕션 빌드 통과.

- 독립 API168개 테스트 통과(6.28초), 남은 차단 이슈 없음. 명시 null을 허용하던 입력은 리뷰 후422로 수정했고 누락 fallback은 유지했다.
- 조정 담당 Edge 모의 브라우저: 공통6 입력만으로 행0 유지, 일괄 버튼으로 등록대상2개에6 적용/제외0보존/초기입고5보존. 개별행0으로 다시 수정 가능.
- 공통-1 적용은 거절하고 기존행값 유지. 미적용 공통값 오류가 유효한 개별행 저장을 막지 않음. 서버409 실패 후 재시도에 값 유지.
- 최종 전송은 각item기준0·6, top생략. 응답확인 후 완료화면에 실제기준과입고표시. 기존SKU재고7 유지.320/390px 전체페이지넘침없음.
- 실제BFF 대량UUID 요청404·과대요청422·catalog전후불변 확인. 성공쓰기는모의,스크립트.local/threshold-browser.cjs(exit0).

## 제한과 복구

실제재고데이터 변경없음. 원자성·동시성·호환은 합성API테스트로검증. 기존옵션 기준수정은 이번등록화면범위외. 실제기기/전체보조기술 미검증. 복구는코드변경되돌림이며SKU/원장삭제없음. 커밋/푸시/배포없음.


