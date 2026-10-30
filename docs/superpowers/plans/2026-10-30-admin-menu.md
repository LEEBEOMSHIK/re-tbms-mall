# WB112 관리자 메뉴 관리 구현 계획

Goal: 승인된 메뉴 그룹화·표시관리, R109.
Architecture: 고정 메뉴 레지스트리와 순서/visible 그룹 설정 분리, 별도 SQLite singleton revision. Next 기존 인증 BFF, 상태/편집 분리.
Tech: 기존 FastAPI/Pydantic/SQLite/Next/React, 새 의존성 없음.
Spec: docs/contracts/admin-menu.md

- [x] backend 담당: 엄격 모델/권한/요청상한/원자적 optimistic lock/재시작 영속, API 실패/경계 테스트.
- [x] frontend 담당: DTO/BFF/편집 및 SaveResult/실패입력보존/409 회복, 관련 검증.
- [x] root: sidebar 그룹/숨김/고정메뉴관리/실패복구, 사이트허브 연결, 문서 및 보드.
- [x] 독립 검증: 코드와 실행결과, 모든메뉴숨김 복구·모바일완료포커스·충돌/실패·직접URL 인증.
- [x] root: 합성 서버 실제 저장/조회·사이드바 갱신/복구 통합검증 후 완료.

수용: 저장 확정 설정으로 그룹순서·메뉴배치·표시 반영; 숨김이 권한을 바꾸지 않음; 실사용 DB 보존. 복구: 이번 코드와 별도 설정DB 백업본으로 복원, 사용자 상품/회원DB 불변. 원본 작업 폴더에서 진행하며 기존 미커밋 보존, push/배포 없음.
