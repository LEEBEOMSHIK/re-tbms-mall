# WB233 FAQ 검증 (2026-11-07)

## 구현 범위
R112. 고객 /faq 검색·5분류·질문 펼침. 관리자 /admin/faq 목록 및 /new, /[id]/edit 별도 화면. 사이트 관리·고객 하단·모바일 메뉴 연결. API app/faq.py SQLite 저장, 관리자 인증, strict 입력 검증, version 충돌, UUID 동일 요청 재시도. 서버 공개 항목만 고객에게 반환. 신규 의존성 없음.

## 실행 결과
- API pytest services/api/tests/test_faq.py: 14 passed (독립 검증자 실행). 공개/숨김, 권한, 길이·범위, 실제 다중 정렬, 순서 변경, 동시 수정 200/409, 동시 신규 재시도 단일 등록.
- 웹 FAQ parser + admin-guide + admin-guide-captures: 6 passed.
- web typecheck 및 FAQ TS/프록시 lint 통과.
- Chrome 실제3100: 숨김 신규 저장→SaveResult 서버 결과/포커스→관리 목록→수정→공개→고객 답변 펼침→검색 결과 없음→다른 탭 stale 수정409→입력 유지 및 오류 포커스→숨김 저장→고객0건 확인.
- FAQ input 스타일이 공통 checkbox에 침범하는 문제 발견 후 checkbox 제외. 키보드 공개 선택/저장 확인.
- PC1600px: 고객 문서 가로폭1583/scroll1583으로 가로넘침 없음. 실제 고객/관리 화면 캡처 확보.
- 가이드 faq:1 등록, 인증 이미지 확대·저장 버튼 표식 시각 확인. 원문·링크·소스·캡처 참조 테스트 통과.
- 별도 faq_review 에이전트가 코드 검토, 경합 테스트 보강 및 실행. 치명 권한/공개 누출 발견 없음.

## 남은 검증
모바일 뷰포트 override가 실제 innerWidth1600을 변경하지 못함. 같은 출처 iframe 검사도 about:blank로 남아 검증 근거로 사용하지 않음. 임시 검사 route·잘못 명명된 모바일 캡처 제거. viewport reset 후 PC1600 복구 확인. 모바일 실제 검증 및 모바일 캡처 미완료이므로 WB233 완료로 표시하지 않음. 네트워크 단절/응답 소실 실제 UI 시뮬레이션은 미실행(동시 수정409 입력 유지 및 동일 요청 재시도 API 검증은 실행).

## 산출물/정리
- .local/faq-customer-pc.jpg: 합성 공개 질문으로 확인한 고객 화면(현재는 숨김)
- .local/faq-admin-pc.jpg: 관리자 목록
- apps/web/guide-assets/faq-editor.jpg: 관리자 편집 캡처, 개인정보 없음
- 합성 질문1개는 로컬 DB에 숨김 보존. 공개 초기 FAQ는 관리자가 등록·게시해야 함.
- 사용 가이드 ID faq 추가. 디자인 시스템 FAQ 절 추가. 작업 상태 단일원본 workboard.md.
- 복구: FAQ 신규 route/component/store 연결만 되돌리고 faq.sqlite3 보존. 기존 미커밋 변경 보존. 배포·커밋·푸시 미실행.

2026-11-08 고객 검색창 제거: 관리자 검색은 유지. 3100 고객 화면 검색 없음·배송2건/답변 펼침·간격 실제 확인. .local/faq-category-only-pc.jpg. 독립 소스 검토 통과. 가이드 faq 완료확인 문구 동기화, 관리자 입력 캡처/표식 위치 영향 없음. 모바일 실검증은 기존 미완료 유지.

2026-11-08 관리자 회귀 확인: 실제3100 목록7건(공개6/숨김1), 배송+본문검색3건, 없는검색0건, 검색 해제3건 확인. 숨김 합성 항목 수정 진입→동일 내용 저장→완료 제목 초점→목록복귀 확인. 신규 빈 저장은 질문 필수검증으로 차단/질문초점 확인. API14 통과(제한환경 실행 응답정지로 별도 권한 임시DB 재실행). 캡처 .local/faq-admin-filter-check.jpg, .local/faq-admin-required-check.jpg. 기능 변경 없음·가이드 기존 절차 일치. 관리자 사이드바 하단 가로스크롤이 PC 캡처에서 관찰되어 별도 공통 레이아웃 점검 필요. 모바일 실검증 미완료 유지.

2026-11-08 관리자 간격 수정: site 고객안내 row 아이콘 누락으로3열이 어긋나던 문제 수정, 링크간12px. 관리자 목록 중복패딩 제거·행8px 간격. 실제3100 사이트관리/FAQ/문의 목록 캡처 .local/admin-care-menu-spacing.jpg, admin-faq-spacing.jpg, admin-inquiries-spacing.jpg 확인. 타입/FAQ·가이드6 통과, 독립소스검토 통과. 입력/상세는 CSS 적용 제외하여 faq/inquiries 가이드 캡처·표식 유지, 절차/URL 불변. 모바일 실검증은 미완료 유지.

2026-11-08 선택 설명 명암 수정: .ds-choice-caption이 선택 배경에서도 일반 회색을 유지하던 원인 수정. 공통 pill의 checked/hover 설명은 label 전경색을 상속. 실제3100 PC FAQ 신규 화면에서 선택·미선택 및 테마 전환 확인. 다크 선택 #251e3d/#c3b7ff 8.66:1, 라이트 선택 #ffffff/#5042b8 7.47:1. FAQ/문의 목록 두 테마 캡처 확인. 독립 inquiry_review 검토 차단 이슈 없음. forced-colors는 소스 검토만 수행, 실제 에뮬레이션 미실행. 테마 다크 복원, 공개 설정 저장하지 않음.
- 캡처: .local/faq-choice-dark.jpg, .local/faq-choice-light.jpg, .local/faq-list-dark.jpg, .local/faq-list-light.jpg, .local/inquiries-list-dark.jpg, .local/inquiries-list-light.jpg.
- 가이드 영향 없음: 색상만 변경, 기존 faq/inquiries 입력 절차·버튼 위치·표식 좌표 동일. 모바일 실검증은 기존 미완료 유지. 전체 사이트 모든 화면의 명암 검증 완료를 의미하지 않음.
- 복구: form-controls.css 마지막 선택/hover caption 규칙만 제거. 기존 미커밋 변경과 데이터 보존.
- 후속 회귀: node --test tests/faq.test.ts tests/admin-guide.test.ts tests/admin-guide-captures.test.ts 6/6 통과.
