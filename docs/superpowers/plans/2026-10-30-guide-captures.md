# WB115 / R110 화면 캡처 중심 사용 가이드

목적: 사용자가 실제 화면에서 누를 곳을 쉽게 찾도록 텍스트 가이드를 캡처와 단계 중심으로 개선. root 캡처/manifest/통합, guide_visual UI/이미지인증route, guide_fixture 합성데이터, 독립검증.
범위: 실제 Next/FastAPI 합성DB/별도host에서 screenshot, 원본변조없이 DOM overlay numbered rectangles. 실제고객/비밀데이터 캡처금지. 새이미지생성도구로 UI를 꾸며내지 않는다.
화면: 검색/업무선택→한 업무만 표시(초기start, hash로선택). 기존10개원문 보존. 단계의 실제캡처 + 버튼표시 + 짧은 설명, 확대 native dialog/닫기/ESC/focus restoration. 모바일 이미지비율유지 확대가능.
계약 lib/admin-guide-captures.ts(root소유): export type GuideCapture={file:string;alt:string;caption:string;markers:{x:number;y:number;width:number;height:number;label:string}[]}; export const GUIDE_CAPTURES:Record<string,GuideCapture> = {'guideId:stepIndex': ...}. 좌표는 image전체 대비0..100 백분율, file jpg basename. 이미지URL /admin/guide/images/{file}. 실제 JPEG apps/web/guide-assets/에 보존; public에 저장안함.
UI담당: protected/guide/guide-view.tsx/guide.css/guide-capture.tsx 및 images/[name]/route.ts. 인증route getAdminSession 필수, exact manifest allowlist, no-store/제한된image/jpeg/nosniff; fs에서 guide-assets 읽기. next.config.ts tracing변경 root소유.
root: manifest/types, 캡처파일, 원문과 일치 매핑, docs/보드/테스트. fixture담당: .local/wb115_api.py, .local/wb115-qa만(기존실사용DB불변). 기본 API8120/web3120 host127.0.0.2, synthetic-only token. UI복사본 .local/wb115-web(운영소스아님).
수용: 10업무 모두 실제캡처 제공, 필요한 동작의 표식이 실제버튼과 일치, 확대/모바일/키보드/인증/안전경로, 가이드 및캡처유지규칙. 검증: manifest자산/좌표/각가이드커버리지테스트, 타입/lint, 실제UI, 별도검증.
복구: 추가이미지/manifest/뷰/route/trace규칙만 되돌림. 기존DB/사용자설정 불변. 저장기능변경없음. 가이드버튼위치/문구/절차변경 시 캡처재검토/교체를같은작업완료조건으로한다.
