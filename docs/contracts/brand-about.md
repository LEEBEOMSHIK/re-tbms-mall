# WB108 / R108 브랜드 소개 콘텐츠 계약

## 범위/소유권
사용자 승인: 개성·관심사를 드러내는 독특한 의류 브랜드 소개, AI/전문분야 디자인 콘셉트 예시 이미지, 관리자 편집/미리보기/게시. 로컬 Next/FastAPI/SQLite 재사용. 주문·상품·재고·AI 생성 서비스 연동 없음.
backend 담당: services/api/app/brand_about.py, services/api/tests/test_brand_about.py, main.py 등록만. frontend 담당: apps/web/src/lib/brand-about.ts, components/brand-about-view.tsx 및 .css, app/about/page.tsx, app/admin/(protected)/brand-about/**, app/api/admin/brand-about/**, app/api/brand-about/**, tests/brand-about.test.ts. root: 이미지/seed JSON/문서/보드/nav/검증.

## 모델
Content = {eyebrow:string(1..60),title:string(1..100),intro:string(1..1500),hero_image:string,hero_alt:string(1..200),topics:Topic[](0..6)}.
Topic={id:string(1..64,영숫자_-),title:string(1..80),description:string(1..800),image:string,alt:string(1..200)}. 모든 text 공백뿐이면 거부, plain text 렌더. topic id 중복 금지. 사진 caption '디자인 콘셉트 예시 · 실제 판매 상품이 아닙니다'는 UI 고정(관리자가 오해 표시를 제거할 수 없음).
image: 승인 기본 preset /images/brand/individuality-hero.png, /images/brand/ai-language.png, /images/brand/hidden-patterns.png 또는 /api/v1/brand-about/assets/{UUID}. 외부URL/다른경로 거부. 업로드 참조 존재 검사.
State={revision:int>=0,draft:Content,published:Content,published_revision:int>=0}. 초안 revision과 전체 revision은 동일, PUT 성공시+1, publish도+1. published_revision은 게시 결과의 revision. 초안과 게시본 별도 보존. 초기 revision0 양쪽 repo seed. 기존 고정 About 대체는 사용자 승인된 초기 콘셉트 예시이며 실제 상품/정책 아님.
seed 파일: services/api/app/data/brand-about-default.json (root 생성), API 코드는 파일 읽기. immutable 기본 콘텐츠를 published로 반환하고 최초저장부터 전용 SQLite에 원자적으로 지속. 기존 상품DB 변경 없음. 테스트 create_app brand_about_path 인자, 미지정+catalog_path면 같은폴더 별도brand.sqlite3 경로. 기본 .local/brand-about.sqlite3.

## API
GET /api/v1/brand-about -> {revision:published_revision,content:published}. 미게시 초안 정보 절대 포함하지 않음.
GET /api/v1/admin/brand-about -> State
PUT /api/v1/admin/brand-about body {revision,content} -> State (초안저장, 409낙관잠금)
POST /api/v1/admin/brand-about/publish body {revision} -> State (현재 저장된 draft만 게시, 409)
POST /api/v1/admin/brand-about/assets body {filename:string,content_base64:string} -> {image:string}. 기존 product_images validation 재사용/동등, JPEG/PNG/WebP만 실제decode후 안전재인코딩; 원본2MiB, 요청3MiB 상한/stream bound, 픽셀상한. SVG/HTML 거부. 자산은 전용SQLite BLOB 저장(파일트랜잭션 불일치 회피). 별도삭제없음.
GET /api/v1/admin/brand-about/assets/{id} -> image bytes (인증된초안미리보기)
GET /api/v1/brand-about/assets/{id} -> image bytes, published에서 참조중인것만, 그외404, no-store. 모든 admin 경로 require_admin, 본문추가필드금지. 401/409/413/422/503 표준.

## Next
동일 API 경로를 /api/admin/brand-about(+publish/assets) 및 /api/brand-about(+assets)로 프록시. admin 기존 session/Origin 검증/401세션만료 정책 재사용, 서버비밀노출없음. body크기제한, 성공DTO검증, no-store. 이미지 경로 helper는 preview일때admin proxy, public일때public proxy로 변환. /about은 공개본문만 조회, 오류시 실패안내/재시도(초안fallback 금지).
/admin/brand-about 읽기 전용 현재상태·편집/저장된초안미리보기·게시. /admin/brand-about/edit 입력만(전체목록없음), /admin/brand-about/preview 저장된초안만 동일 View 렌더. 보호레이아웃기존재사용. 편집기 내 미저장미리보기 가능하지만 게시 버튼은 상태화면의 저장된버전에만.
저장/게시 SaveResult에 확정버전·제목·후속링크. 실패입력보존.409/결과불확실시 무조건 자동덮어쓰기 금지; 최신조회는 현재 입력 유지하며 사용자가 최신버전기준 재저장 가능. 저장성공후목록조회가 없어도 확정응답만으로 결과표시. 중복클릭잠금. 모바일 SaveResult 제목focus. 업로드만 완료는 전체초안저장완료와 구분.

WB109: 기본 preset에 /images/brand/human-ai.png 추가. 신규 기본본문은 human-ai 주제를 포함하며, 기존 저장된 초안/게시본은 그대로 유지한다.
