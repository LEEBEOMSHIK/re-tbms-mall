# WB84 / R92 공장 홈 대시보드 검증

## 구현

담당 공장 workspace의 전체 자료로 담당 상품 수, 진행할 시안(작업대기/확인중/샘플작업), 미처리 제작 요청(요청/접수/제작중)을 집계한다. 완료/취소는 미처리에서 제외한다. 네 가지 시안 상태 분포를 표시하며 시안 업무는 확인중·샘플작업·대기 순, 제작업무는 납기순(미지정뒤)으로 각각 최대5개 미리보기한다. 표시 기준은 화면에 적는다.

홈은 요약/업무 미리보기로 제한한다. /factory/products와 /factory/production-requests 목록으로 분리하고 기존 검색/상태필터/페이지크기/페이지복귀를 유지한다. 시안 업무는 해당상품progress상세, 제작업무는 해당요청상세, 상품목록의 상품명은 상품상세로 연결한다. 상단 업무메뉴는 현재영역을 표시한다.

내부 관리자와 같은 색상/간격/라운드/수치 위계 및 공통 ValueStatus를 사용한다. 별도 관리자 샘플데이터·재고값을 섞지 않는다. API/DB/권한/상태전이는 변경하지 않는다.

변경파일9개: factory-workspace.tsx, factory-dashboard.tsx/css, factory-navigation.tsx, factory/(protected)/layout.tsx, products/page.tsx, production-requests/page.tsx, lib/factory-dashboard.ts, tests/factory-dashboard.test.ts (apps/web/src 기준, tests는apps/web/tests).

## 검증

- 구현자 worktree typecheck exit0, 집계 테스트4/4 통과. 완료/취소제외·최대5와전체총수·납기정렬·원본불변·빈데이터 확인.
- 독립검증자가 집계helper를 별도실행해 네시안/다섯제작상태·원본불변·빈값을 확인했다.
- 기존WB82 primary worktree의 연속작업으로9파일만원본에통합했다. 다른WB83설계/원본문서변경을보존한다. 원본DB/시안/제작상태 쓰기없음.

최종 브라우저/통합 검증 결과는 아래에 기록한다.

## 복구/제한

UI9파일만 이전버전으로복구하면되며 마이그레이션없음. 신규운영배포/커밋/푸시없음. 원본3100/8100 유지. 기존worktree는앱기본체크아웃보호로archive보류상태를유지하며이번에추가서버를띄우지않았다. 집계는기존API가허용한공장범위자료만대상이며분산/대량데이터성능검증을수행했다고표현하지않는다.

## 최종 검증 결과

- 통합 원본 typecheck 재실행 exit0. 최초 실행은 Next 개발서버가 새 경로 validator.ts를 재생성하는 중 문법오류가 발생했고, 생성 완료 후 재실행하여 통과했다. 소스 오류를 숨기거나 생성 파일을 직접 고치지 않았다.
- lint: 내부목록 a를 Next Link로 바꾼 뒤 구현자 재실행 exit0, 최종수정도 원본통합. 집계4개와 작업보드5개를 원본에서 다시 실행해9/9 통과.
- 독립 브라우저: 실제 공장테스트로그인 후 합성25상품/25요청으로 담당25·진행시안19·미처리요청15, 시안분포7/6/6/6 확인. 3경로×1440/390×light/dark=12보기,큰글씨,검색/필터/페이지크기초기화, 요약불변, 키보드목록이동/정확한상세링크,빈0/조회실패/복구 구분 통과. 관리자API차단, 업무쓰기0, JS오류0.
- 증거: .local/wb84-dashboard-review.cjs, wb84-dashboard-review.json, wb84-dashboard-review.png. 스크린샷 직접 확인하여 내부관리자와 같은 카드배경·패널간격·상태/수량위계 및 하단업무링크 확인.
- 3100 최초브라우저경로읽기20초timeout은60초대기로재실행했고 HTTP200 및 최종실행통과를확인했다. 운영성능검증결과로해석하지않는다.

## 2026-10-28 공장 헤더 후속 수정

- 원인: .factory-header button의 좌우16px 패딩이44px설정버튼을덮어 SVG flex영역을축소했다. SVG선언24px만검사하고실제렌더크기를놓쳤다. 별도GNB행과큰공백이헤더위계를분리했다.
- 수정: 범용공장button선택자에서설정trigger/close제외, 공통SVGflex-shrink방지, 공장쉘desktop로고/GNB/tools한행정렬. 좁은화면은로고/tools와별도가로스크롤nav, 폼의모바일전체폭규칙과도구영역분리.
- 파일: factory/(protected)/layout.tsx, factory.css, factory-shell.css, components/site-settings.css. 기존WB84의시각수정,API/데이터변경없음.
- 검증: 실제SVG boundingClientRect24×24와버튼44×44,1440/2136/390·light/dark·큰글씨,메뉴이동/설정포커스. 독립검증진행.

검증 표기 정정(2026-10-28): 이전 WB84 브라우저의 data-text-size=larger 설정은 실제본문20px이며24px가아니다. 이전12보기의 확대검증은 ‘더 크게(20px)’로 정정한다. 이번헤더검증에서는 html font-size24px를 명시하고 실제본문크기까지 측정한다.

후속최종: 원본typecheck exit0. 독립실측6보기(1440/2136/390×light/dark) 실제본문24px에서 SVG24×24·trigger44×44확인. desktop한행중앙정렬, mobile하단nav영역스크롤/문서넘침없음, 설정Enter/닫기SVG24/Escape포커스복귀·메뉴키보드/currentpage 통과. root도desktop/mobile스크린샷직접확인. .local/wb84-shell-review.json, wb84-shell-1440-dark.png, wb84-shell-390-dark.png. 실제업무데이터변경없음.

## 2026-10-28 ERP형 왼쪽 메뉴·프로필

사용자 요청대로 공장 보호화면에 왼쪽사이드바(로고/업무3메뉴)와 우측본문·상단도구를 배치했다. 상단은 설정·로그아웃옆프로필이며 프로필에서 인증된display_name/supplier_name/username/역할을읽기전용조회한다. 가짜이름대체없음,503재시도,401은로컬세션폐기후로그인복귀. 기존workspace API만조회하고계정수정API없음.

모바일 native dialog 메뉴는닫기/Escape/바깥클릭·메뉴/브랜드이동닫힘·포커스복귀를지원한다. 데스크톱전환시모달닫힘,메뉴현재경로와24px아이콘·44px설정버튼유지. 본문너비는사이드바제외영역기준으로적용한다.

관련 파일: factory/(protected)/layout.tsx, factory-shell.tsx/css, factory-navigation.tsx, factory-workspace.tsx의중복계정표시제거. root문서/통합, factory_ui_audit구현, factory_verify독립검증. 기존WB84연속worktree사용·DB/업무상태쓰기없음.

최종 검증: 구현자 typecheck/lint exit0, 통합 원본 typecheck exit0. 독립 브라우저 스크립트 exit0: 1440/390px × light/dark, 실제 본문24px에서 문서 가로 넘침 없음, 설정SVG24×24/버튼44×44. 실제 계정·소속·아이디·역할 표시와 관리자API401 확인. 모바일 메뉴 선택 후 닫힘·현재메뉴·Escape 포커스 복귀, 설정 Escape 복귀, 프로필503 재시도 회복 및401 세션DELETE 후 로그인 화면 정착 통과. 업무 데이터 쓰기 없음. root도 desktop 및 mobile 프로필 스크린샷 직접 확인. 근거: .local/wb84-sidebar-review.json, wb84-sidebar-1440-dark.png, wb84-sidebar-menu-390-dark.png, wb84-sidebar-profile-390-dark.png. 설정 닫힘 초기 검증 실패는 비동기 닫힘 완료 전 검사였으며 hidden 대기 후 재실행 통과했다.

## 프로필 카드 후속 정리
R92/WB84: 아바타·이름·역할을 헤더로 묶고 공장과 아이디를 보조 위계로 정리했다. 긴 아이디는 한 줄 말줄임/전체 보기·접기로 제공한다. 수정 파일은 factory-shell.tsx/css. 인증/API 변경 없음. root 구현 및 typecheck/대상 ESLint exit0, factory_verify 독립 스크립트 exit0. 1440/390 × light/dark 실제본문24px 4보기에서 카드/문서 넘침 없음, 실제 계정값 일치, Enter로 아이디 펼침/접기 및 Escape 포커스 복귀 확인. root와 검증자 스크린샷 확인. 근거 .local/wb84-profile-card-review.cjs/json, wb84-profile-card-390-dark.png, wb84-profile-expanded-390-dark.png. 503/401은 앞선 검증을 유지하며 이번에는 재실행하지 않았다. 업무 데이터 쓰기 없음. worktree 동기화는 자동검토가 처음 거절했으나 두 파일 diff로 이번 수정만 있음을 확인한 뒤 승인/완료했다. 복구는 이번 JSX/CSS 변경만 되돌리며 데이터 마이그레이션 없음.
