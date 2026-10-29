# 의류 모델 생성 자료

WB93 관리자 통합에 사용한 샘플의 Blender 생성 스크립트와 입력 자산입니다.
`assets`에는 원본 OBJ와 기본 입력 JSON을 보존했습니다. 현재 런타임 결과는
`apps/web/public/garment-studio/assets`에 있습니다. 스크립트는 이 폴더의 `assets`에
결과를 생성하므로 검토 후 필요한 결과만 런타임 위치로 옮깁니다.

원본 자산의 출처와 이용 조건은 런타임 폴더의 `model-provenance.json`,
`hoodie-provenance.json`, `provenance.json`에 보존되어 있습니다.
후드 CC-BY 출처 표시는 편집 화면 하단에도 유지합니다.

회귀 검사: apps/web에서 `node --test tests/garment-studio/*.test.mjs`.
독립 샘플의 브라우저 저장 데이터는 관리자 서버에 자동 이관하지 않습니다.
