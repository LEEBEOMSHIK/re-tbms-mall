# WB108 / R108 브랜드 소개 구현·검증

## 범위/계약
사용자 승인된 개성·관심사/AI·전문분야 콘셉트로 About 교체. 이미지3장 생성(프롬프트/출처 docs/reviews/brand-about-images.md), 사이트관리→브랜드소개 상태/편집/미리보기/게시. 별도 콘텐츠·이미지 SQLite, 기존 카탈로그/재고/고객데이터 미변경. 상세 API/파일소유권: docs/contracts/brand-about.md. 계획: docs/superpowers/plans/2026-10-30-brand-about.md.

## 자동 검증
- backend 담당: 브랜드21 + 기존 상품이미지28 =49 통과. 인증 전체경로, 동시 revision 경합200/409, 게시본/초안/자산격리, 재시작지속, 저장503, 업로드실decode/재인코딩/메타제거/픽셀·본문제한 확인.
- root 통합: 브랜드21+이미지28+고객41=90 passed(14.28s), 웹전체188 통과, 타입검사·변경범위 ESLint 통과.
- 독립 brand_review: 브랜드API21/웹brand+nav7 통과 및 수정후7 재통과. 합성 임시DB만 사용. TestClient socketpair가 sandbox에서 정지하여 require_escalated 실행.
- 발견수정: topic id='hero'가 대표이미지 업로드 대상과 충돌 → 판별유니온 분리; 미리보기 h1중복 → h2/h3/h4, 고정section id중복 제거; 공개오류 같은주소 재시도 → 일반a로 서버재조회; 사이트관리복귀경로·제품탐색CTA 정리.

## 실제 브라우저 통합 QA
기존 API8100/웹3100의 데이터와 분리한 API8118/웹3118, .local/wb108-qa의 합성키/DB 및 .local/wb108-web 소스복사. 실제 고객 OAuth·주문·판매 데이터 사용없음.
- 보호된 편집 직접URL 비로그인 → 관리자로그인. 합성 관리자 테스트로그인→사이트관리→상태→편집→저장→미리보기/상태 경로 확인. 상태 화면 작성폼 없음, 편집 전체목록 없음.
- 모바일390px 제목 수정→초안저장 revision1. SaveResult 확정제목/버전/후속링크, 완료h2 focus 확인, 가로넘침없음. 공개About 기존제목 유지, 저장된초안미리보기만 수정제목.
- 상태화면 게시 revision2 → SaveResult 제목focus, 공개About 재조회 후 게시제목 확인.
- 80px 합성PNG 실제 파일선택 업로드 → 이미지 naturalWidth80 표시, 업로드만으로 SaveResult없음/초안저장 필요 안내. 저장 revision3.
- 두탭 편집: 첫탭revision4 저장, 다른탭 stale3 제출→409/입력 유지/저장 비활성. 최신조회에도 현재입력·emoji 보존, 최신저장본 별도표시, 명시 재저장준비 후 revision5 성공.
- 소유한 합성 API8118만 중지→저장503 결과불확실 안내, 입력 유지/SaveResult없음/저장 비활성. API복구 후 최신조회에도 입력보존. 공개About 오류는 초안/기본본문으로 대체하지 않음. 저장성공은 확정응답만 사용하며 후속조회 의존없음.
- 합성콘텐츠는 seed로 다시 저장/게시(revision7)하여 최종화면검증. desktop1440px dark / mobile390px dark / 320px light 큰20px 확인. 320px scrollWidth<=innerWidth, 이미지3개 실제로드, 예시caption/주제사진4:5·텍스트 줄바꿈 확인.
- 캡처: .local/wb108-save-mobile.png, wb108-publish-mobile.png, wb108-conflict-recovered.png, wb108-network-recovery.png, wb108-about-desktop.png, wb108-about-mobile.png, wb108-about-320-large.png.
- 독립검증자는 코드/자동테스트와 저장·게시·복구 캡처를 대조, 수정 확인 후 차단 이슈 없음. 실제 브라우저 실행 주체는 root.

## 제한/복구
실휴대폰·운영 배포·사업정책/법정소개 검증은 범위외. 이미지3장은 디자인 콘셉트 예시이며 실제 판매상품 등록이 아니다. 고객용 이미지생성 API/유료외부서비스 연동 없음. 기존미커밋 변경 보존, 커밋·push·배포 안함. 복구는 이번 소스변경과 별도 brand-about.sqlite3 보존/복원, 기존상품DB 마이그레이션없음.

## 최종 통합/정리
- 기존 API8100 /api/v1/brand-about, 웹3100 /about 모두200 및 승인된기본문구 포함 확인(쿠키없는 공개읽기만).
- 최종 독립 검증자가 1440/390/320큰글씨 캡처 및 문서를 검토해 완료판정, 차단결함 없음.
- 검증용 API8118/Web3118 소유프로세스 확인 후 종료. .local/wb108-web/.next만 절대경로가 QA폴더 안임을 확인해 제거. 재현용 .local/wb108-web 소스복사/의존성junction, wb108_api.py, wb108-qa 합성DB/업로드fixture와 캡처는 보존. 추가worktree/커밋없음. 뷰포트·테마/글자설정 복원, 에이전트테스트탭 닫음.
- QA는 localhost 별도포트에서 관리자 테스트 로그인했으므로 동일호스트 관리자쿠키가 테스트세션으로 바뀔 수 있음. 고객로그아웃/외부OAuth 동의는 실행하지 않음. 다음 검증은 쿠키까지 분리하려면127.0.0.1 별도호스트 사용.
