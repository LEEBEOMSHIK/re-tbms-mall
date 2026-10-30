# 2026-10-29 작업 보드 오래된 상태 대조

- 사용자 지시: 오래된 작업 보드 상태 정리 후 WB88 진행. root 문서 정리, 별도 독립 검증.
- 실제 확인: HEAD185d8cc/main, git merge-base --is-ancestor 33d5073 HEAD exit0. git worktree list에 C:/projects/re-tbms-mall 한 개.
- C:/Users/bumci/.codex/worktrees/parallel-work/re-tbms-mall 및 factory-test-login/re-tbms-mall 경로 부재. 기존 보존 폴더 .local/integration-WB93/preserved-worktree, preserved-factory-worktree 존재. 전자는 designs.sqlite3/과거 백업/원본 연구/설정 폴더 존재까지 확인, 비밀/DB 내용 출력하지 않음.
- WB93의 primary checkout 보호 때문에 정리 대기라는 과거 현재형을 교체. 실제 삭제 방법/시간이나 archive 성공은 확인 불가. 남은 관리형 worktree 없음으로 현재 정리 작업 불필요. 원본 스냅샷 브랜치/보존 백업은 삭제하지 않음.
- WB83의 별도 실행·미통합 문구를 제거하고 구현 이력을 보존. WB93으로 통합된 범위와 아직 실제 검증하지 않은 WebGL/두탭/정량성능을 분리, 후자는 next(미착수 제안). 실제 물성/제작치수 검증 완료로 표현하지 않음.
- WB09는 내부용 전체 미정 대신 고객용/AI/추가출력의 미정으로 수정. 사업 승인 새로 만들지 않음. WB88은 이번 명시 지시 범위로 한정하며 구현 검증은 docs/reviews/product-details.md에 기록.
- 앱 재검증은 이 문서 정리와 별개. 기존 통합 검증 근거 docs/reviews/studio-integration.md 및 현재 파일/Git 증거 사용. 저장소 파일 삭제/DB 변경/커밋 없음.
- 독립 검증: review_product_detail이 통합 커밋 포함·등록 worktree1개·예전 두 폴더 부재·보존 폴더 존재를 읽기 전용으로 재확인. 상태 정정 통과. 삭제 방법/시각 또는 archive 성공은 확인하지 않았음.
- 최종 보드 상태 갱신 후 node --test tests/workboard.test.ts (apps/web): 실제 저장소 보드 파싱 포함 5/5 통과.
