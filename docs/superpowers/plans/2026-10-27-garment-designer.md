# Garment Designer Implementation Plan — WB83

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 내부 관리자용 티셔츠/후드 2D 편집·3D 즉시 확인·저장/복원 및 별도 포트 실행.
**Architecture:** 단일 정규화 문서, client-only 3D renderer, 관리자 BFF, 별도 SQLite 디자인 저장소. 계약을 먼저 고정하고 서버/렌더러/관리화면을 서로 다른 파일 소유권으로 병렬 구현한다.
**Tech Stack:** 기존 Next.js/React/TypeScript, FastAPI/Pydantic/SQLite/Pillow, Three.js(CanvasTexture/standard material).
**Spec:** ../specs/2026-10-27-garment-designer-design.md (사용자 승인 2026-10-27).

## Global Constraints

- 기존 원본 C:/projects/re-tbms-mall 앱/DB/서버는 변경하지 않는다. 이 worktree만 구현한다.
- 웹3101/API8101 후보, 실행 직전 검사. 쿠키 namespace·DB·환경변수·의존성 분리, 로컬 Docker 금지.
- 상품/SKU/재고 불변; 내부 관리자만 접근. 공장 토큰은 거부.
- 초기 print만,20레이어·40자산/40MiB,2MiB/이미지·4096변·16MP·3MiB 업로드·256KiB 문서. 임의 URL/SVG/애니메이션 금지.
- immutable version, base_version 충돌, request_id 멱등·실패 입력 보존. 모바일/테마·저장UX·화면분리 필수.
- 보드는 원본 조정 담당만 변경. 추가 구현 계획 승인을 반복 요청하지 않고 사용자의 명시적 구현 지시에 따라 진행한다.

## Review Focus

- 후면 좌우/UV 경계: 비대칭 표식을 앞뒤에서 비교한다 (Task2/4).
- 두 탭 충돌과 응답분실: 같은 request_id 재시도·로컬 입력 보존 검증 (Task1/3).
- 늦은 이미지 해독/화면전환: 이전 asset load가 최신 디자인을 덮지 않음 (Task2/4).
- 3D context loss:2D/저장 유지, 재시도 및 리소스 해제 (Task2/4).
- localhost 쿠키의 포트 공유: 기존 서버 로그인과 worktree 로그인이 독립 (Task4).

## 고정 계약 (모든 담당자)

Template IDs `tshirt`, `hoodie`; version=1. Material IDs `cotton`, `polyester`, `sweat`; version=1. Surface `front`/`back`. 기본 base_color=#e8e5df, gloss=0.15, material_id=cotton.
DesignDocument={schema_version:1,template_id,template_version:1,material_id,material_version:1,base_color,gloss,decorations:Decoration[]}.
Decoration={id,technique:'print',surface_id,asset_id,center:{x,y},size:{width,height},rotation_degrees,visible}. rotation-180..180, 유한 숫자. 배열은 아래→위 순서.
Print rect both surfaces: tshirt{x:0.25,y:0.24,width:0.5,height:0.5}, hoodie{x:0.27,y:0.26,width:0.46,height:0.30}. 2D garment extent normalized0..1, same coordinates map to 3D body front/back. 회전된4모서리가 rect 안에 들어와야 한다.
AssetMeta={id,mime,bytes}; DesignRecord={id,name,version,document,created_at,updated_at,assets:AssetMeta[]}.
GET list response={items:DesignRecord[],total,page,size}; list may return full document/metadata but never asset bytes. q search param. templates response={templates:[{id,version,name,surfaces:[{id,print_area}]}]}; materials={materials:[{id,version,name}]}.
POST create body={request_id,name,template_id,template_version:1} ->201 DesignRecord.
PATCH body={request_id,base_version,name,document} ->200 DesignRecord.
POST assets body={request_id,data_url} ->201 AssetMeta; GET asset returns binary content type. Asset URL=/api/admin/designs/{projectId}/assets/{assetId}.
POST copies body={request_id,name,document} ->201 DesignRecord with asset IDs remapped. Response detail error string or {error:string} at BFF. JSON API never leaks images except authenticated asset route.
Server registry/module owns backend validation; frontend model mirrors fixed JSON contract with contract tests. ID strings UUID, metadata strings ISO UTC. Any contract change notify coordinator first.

## Task1: Server document/asset persistence (backend owner)

Files new services/api/app/designs/{__init__,models,store,routes}.py, tests/test_designs.py. Root only registers route in main.py.
Interface `register_design_routes(application, require_admin, db_path:Path)`; independent DB supplied by root. Tests may create a small FastAPI host with test-only auth and register function.
- [ ] Write tests: create/roundtrip empty/print documents; reject wrong template/version/material/NaN/rotated overflow/21 layers/foreign asset; exact bounds accepted; factory/unauth401;413 overbody; corrupt/animated images;41 assets; copy asset remap;two writers409;receipt retry returns prior result.
- [ ] Run .venv/Scripts/python -m pytest tests/test_designs.py, prove failing behavior.
- [ ] Implement strict schemas, versioned registry, SQLite atomic transactions/receipt, bounded streams before JSON/decode, image cleaning and asset project relationship.
- [ ] Run focused and API full tests; report actual red/green evidence. No main.py/shared docs edits or commits by worker.

## Task2: Shared model/2D composition/3D rendering (renderer owner)

Files new apps/web/src/features/garment-designer/model.ts, composite.ts, garment-geometry.ts, preview-3d.tsx; tests/designer-model.test.ts, designer-geometry.test.ts. Root owns dependencies.
Interfaces model exports DesignDocument,Decoration,AssetMeta,DesignRecord,SurfaceId,createDocument(templateId),PRINT_AREAS,MATERIALS,TEMPLATES,validateDocument(document):string[]. composite exports `paintDesign(ctx,doc,surface,images:Record<string,CanvasImageSource>,size:number):void`, includes garment for PNG and 2D view; and texture painter for body surface with exact UV mapping. Preview3D default props={document:DesignDocument,assetUrls:Record<string,string>}.
- [ ] Tests createDocument defaults, boundary rotated polygon, back orientation mapping, mesh finite positions/normals/UVs/nonzero depth/hood geometry. Run failures before implementation.
- [ ] Implement normalized model and pure transform helpers, coherent tee/hood mesh/body/neck/sleeves/hood, independent appearance map. No flat billboard replacement.
- [ ] Implement async asset decode with sequence guard, full garment Canvas paint and matched UV texture, Three client component orbit/zoom/reset/refresh/context loss fallback/disposal and fixed studio lights.
- [ ] Run tests and typecheck after dependency setup. Report renderer limitations explicitly. No UI page edits or commits.

## Task3: Authenticated pages/editor (UI owner)

Files new apps/web/src/features/garment-designer/{client,designer-pages,designer-editor,designer.css}, app/admin/(protected)/designs/{page,new/page,[id]/page,[id]/edit/page}.tsx and tests/designer-editor.test.ts if extracting pure history/commands.
Consumes Task2 model/Preview3D (imports exact filenames); root provides BFF paths contract. `assetUrls` built from record assets endpoint, do not expose backend token.
- [ ] Implement test-first bounded immutable history, move/rotate/duplicate/reorder/delete/hide commands; invalid input preserved and save blocked.
- [ ] Build list/search/page size with common pagination, creation, saved detail PNG download, editor2D selection/drag/numeric controls/history/material/color/gloss/surface switch/3D immediate update. Separate URL authentication via requireAdminSession.
- [ ] Preserve request payload+ID on uncertain retry, reset it on edits, conflict reload with explicit discard and save-copy; pending duplicate disable, dirty leave guard, SaveResult/focus and success-query-failure distinction. Editor retains doc on network failure.
- [ ] Tests+lint/type, direct URL auth and browser flows handed to root. No shared nav/BFF/model edits or commits.

## Task4: Integration/run/verification (coordinator)

Files main.py(router registration and design_path), app/api/admin/designs/[...path]/route.ts plus root route if needed, lib/design-proxy.ts, admin navigation, session-core cookie namespace, scripts/dev-designer.ps1 and docs.
- [ ] Add behavior tests first: namespace opt-in validates name/default unchanged, nav selection, BFF allowlist/method/body bound/auth/origin/status/binary asset response.
- [ ] Install isolated deps, read installed Next docs before route code. Register server, implement bounded authenticated proxy and route family. Nav link uses existing shared component style.
- [ ] Runtime script configures local keys without logging, namespace, CORS, API base, local paths; verify port freedom before starting own processes hidden. Never kill original processes.
- [ ] Run web full tests/lint/type/build and API full tests, then start3101/8101 and browser-test create→upload→edit→3D→save→reload→PNG;mobile/dark/failure/conflict/keyboard/unauth.
- [ ] Independent reviewer checks actual diff and representative tests. Fix issues, record evidence/limitations/rollback, commit scoped work and update original board only after independent+integration pass. No merge/push/archive active worktree yet.

## Self-review

Spec sections mapped: template/material/UV/extension→Task2;storage/auth/version/assets→Task1;UX/separate routes/export/history→Task3;runtime/security BFF/tests/cleanup docs→Task4. Types and constants above are the interface source for this implementation. No customer/factory editing, no catalog writes, no physical simulation included.

## Execution evidence

Append actual commands/results and coordinator rulings here or final docs/reviews/garment-designer.md. Work status remains original workboard.md.

2026-10-28 실행: Task1~3 구현 및 테스트, Task4 worktree 내부 연결·빌드·독립 검토를 수행했다. 후보 점유로3102/8102 사용. 상세 항목 중 미실행 실기 검증이 있어 체크박스를 일괄 완료로 변경하지 않는다. 실제 결과 및 후속 검증은 ../../reviews/garment-designer.md. 원본 작업 보드만 상태 원본으로 유지한다.
