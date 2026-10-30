# WB120 주문서 시안 검증
- 범위: /checkout/preview 합성 시안. 실제 주문/결제/주소판별 미구현.
- 타입검사 npm run typecheck 종료0, 대상 eslint 종료0, 보드 node --test apps/web/tests/workboard.test.ts 5/5.
- 실제 IAB PC 화면 및390px 모바일 단일열 확인. 모바일 document scrollWidth375 <= innerWidth390, 본문343px.
- UI 시연: 2개64,000원/무료,1개35,000원(배송3,000원), 제주 선택 시 진행버튼 disabled, 일반지역 복귀 후 체크/시안확인 완료문구 확인. 입력 저장·주문 API 호출 구현 없음(소스검토).
- 독립 checkout_preview_review: 정책/비저장/실요청없음 검토 및 별도 lint 통과. 모바일 여백중복·801~900px협소 권고를 padding-inline0/900px분기로 수정 후 모바일 재확인.
- 증거: .local/wb120-checkout-preview.png. 관리자 가이드 영향 없음: 고객 시안만 변경.
- 제한: 밝은테마·실기기·실주소검색·실로그인주문·PG·재고예약 검증 아님. 주문/결제 WB118은 진행 중 유지.
- 복구: 신규 checkout/preview 경로와 관련 문서 추가분 제거, DB 변경 없음.

## 중복선·시안도구 정리
- 사용자 피드백: 시안 조건의 의미 불명확, 결제 요약 구분선 중복.
- 원인: globals.css dl border-block과 checkout-grand border-top 중복.
- 변경: dl 로컬 border/padding 초기화, 도구 기본닫힌 details, 첫 상품구역의 불필요한 상단선 제거.
- 범위는 시안 표현만이며 정책/실주문/관리자 가이드 영향 없음.
- 후속 검증: scoped ESLint 종료0, 독립 정적 검토에서 details 기본닫힘·dl 로컬 초기화·총계1개선·정책로직불변 확인. 실제 화면 재검증은 로컬 브라우저 연결 거부/시간초과로 미완료(개발서버 Ready 확인). 기존 캡처는 수정 전 증거이며 최신으로 대체하지 않음.

## 2026-10-30 로컬 연결 복구 및 후속 화면 검증
- 원인 관찰: 기존 프로젝트 Next.js PID216164가127.0.0.1:3100을 LISTEN했으나 HTTP15초 timeout. sandbox 안에서는 포트/프로세스가 보이지 않아 EADDRINUSE와 접속실패가 함께 나타남. 프로세스 내부 멈춤의 근본 원인은 확정하지 않음.
- 복구: 해당 프로젝트 명령행을 검증한 Next 프로세스205900/216164만 종료하고, 숨김 독립프로세스로 같은3100/127.0.0.1 재시작. 다른 프로젝트/백엔드/DB 변경 없음. HTTP200 및 localhost 브라우저접속 확인. 로그 .local/checkout-server.out.log / .local/checkout-server.err.log.
- PC1440x1000: 테스트도구 기본닫힘, summary dl하단선0px/합계상단선1px. 화면 육안 확인. scrollWidth1425 <=1440.
- 모바일390x844: 단일열343px, scrollWidth375 <=390, 합계 구분선1개·입력/버튼 화면 확인. 체크 전 안내와 체크 후 시안완료 결과 확인.
- 도구 펼침: 1개35,000원(배송3,000),2개64,000원(무료). 제주/도서산간 각각 합계미정 및 버튼disabled 확인. 일반지역 복귀 확인.
- 새 증거: .local/wb120-fixed-pc.png, .local/wb120-fixed-mobile.png, .local/wb120-fixed-mobile-summary.png. 테스트 뷰포트 원복.
- 이전 독립 정적검토/scoped lint 결과와 이번 통합 화면검증으로 시안수정 검증 완료. 실기기·실결제·주소판별·계정연동 검증은 포함하지 않음. 관리자 가이드 영향 없음.
