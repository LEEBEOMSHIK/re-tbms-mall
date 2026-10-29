# WB45 다크 모드 검증

2026-10-26 / R55. 구현: inventory_ui(설정·초기 적용), 조정(색상 토큰·통합), 독립 검증: inventory_review.

사이트 설정의 화면 및 접근성에 라이트/다크/시스템을 제공한다. 기본은 시스템이며 브라우저 저장·다른 탭 동기화·OS 변화 대응을 구현했다. 초기 head script는 정적 문자열만 사용하며 저장값을 허용 목록으로 해석한다. 상품 이미지에 색상 필터를 추가하지 않았다. 공통 토큰과 상태 배지의 다크 팔레트, 네이티브 color-scheme, dialog 배경을 적용했다.

## 실행 검증

- 테마 helper 및 초기 script의 저장값/OS 조합 테스트 포함, 독립 전체 웹 테스트 57개 통과.
- Edge 실제 브라우저: 기본 OS dark, 명시 light 우선, system 모드 OS 전환, reload 유지, 다른 탭 변경, 잘못된 저장값, localStorage 접근 차단 환경의 현재 탭 전환 확인.
- 글자 크기 더 크게와 독립 적용, 관리자 공급처 입력의 dark 배경, 390px 설정 모달 가로 넘침 없음, Escape 닫기/트리거 포커스 복귀 확인. pageerror 없음.
- 다크 주요 텍스트 대비 측정: 기본/surface 15.99, 보조/surface 9.61, 보조/subtle 8.17, 오류/surface 9.27, 성공/surface 12.53, 버튼 전경/배경 15.99. 이 측정은 전체 접근성 인증이나 모든 조합에 대한 보증이 아니다.
- 모바일 확대 글꼴 설정 모달을 시각 확인했다. 실제 데이터 변경 없음.

독립 lint/typecheck/production build 모두 exit 0. 작업 보드 파서 5개 통과. API·DB 변경이 없어 백엔드 테스트는 반복하지 않는다.

## 파일·복구

theme-control.tsx/css, lib/theme.ts, tests/theme.test.ts, site-settings-content.tsx, app/layout.tsx, globals.css 및 문서. 이번 초기 script·컴포넌트·토큰 변경을 되돌리면 복구 가능하며 저장 키가 남아도 이전 버전의 업무 기능에 영향이 없다. 계정 동기화는 구현하지 않았고 테마는 브라우저별 설정이다.

