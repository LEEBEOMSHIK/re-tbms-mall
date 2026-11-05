# 로고 자료실 계약 — WB160 / R108

관리자는 `GET/PUT /api/v1/admin/brand-library`, `POST .../assets`, `POST .../publish`, `GET .../assets/{id}`를 사용한다. 공장은 `GET /api/v1/factory/brand-library` 및 `GET .../assets/{id}`만 사용한다. 각 역할의 Bearer 세션을 서버에서 검증하며 비활성 공장 계정은 차단한다. 웹 BFF는 `/api/admin/brand-library`와 `/api/factory/brand-library`로 대응하고, 쓰기 요청은 동일 출처만 허용한다.

- 업로드: `{filename,content_base64}`. PNG 실제 형식·단일 프레임·최대2 MiB/4096px/1600만 픽셀. 원본 불변 UUID와 파일명/크기/치수 반환. API 스트림3 MiB 상한. 업로드만으로 초안에 저장하거나 게시하지 않는다.
- 초안 저장: `{revision,content:{assets:[{asset_id,title,usage}],notes}}`. 자료1~12개, 중복불가, 이름80자·용도300자·변경요약500자 필수. 알 수 없는 원본422. 저장시 revision 증가.
- 게시: `{revision}`. 저장된 초안을 원자적으로 공개, published_version 증가 및 published_at UTC 기록. 충돌/게시할 변경 없음409. 오류시 입력 보존 후 최신상태 확인.
- 관리자 조회: revision, draft, published, available, published_version/at. 공장 조회: content(게시본), published_version/at만 포함. 미게시/게시에서 제외된 파일은 공장404. 관리자만 과거 원본 재선택 가능.
- 다운로드: API `?download=true`, 웹 `?download=1`. image/png, attachment, no-store, nosniff. 로컬 원본과 바이트 동일.
- 저장소: 기본 `.local/brand-library.sqlite3`. create_app에 catalog_path를 제공하면 같은 디렉터리의 `{catalog stem}-brand-library.sqlite3`로 테스트/환경 분리. 초기3종은 API패키지 `app/data/brand-library`에 웹원본과 동일하게 포함한다. 백업·복구는 SQLite 일관성 있는 backup 사용, DB를 컨테이너 임시계층에 두지 않는다. 운영 이미지 구성/기동 검증은 아직 미실행.
- 기존 공개 로고 URL은 유지한다. 새 업로드는 public 디렉터리에 쓰지 않는다. 자료실 게시는 쇼핑몰 헤더 변경이나 인쇄 제작 승인을 뜻하지 않는다.
