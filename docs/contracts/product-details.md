# WB88 / R104 상품 상세 정보 계약

ProductCreate/Update 및 관리자 Product, 고객 PublicProduct에 `details` 객체 추가.
```
{material_info:string, care_instructions:string, measurement_note:string,
 measurements:[{size:string,label:string,value_cm:number}]}
```
- 소재·혼용률 안내 material_info 최대1000, 세탁 care_instructions 최대2000, 실측 안내 measurement_note 최대1000. plain text, 앞뒤 공백 제거. 빈 문자열 허용. 실제 값 임의 생성 없음.
- measurements 최대100행. size 1~40자, label 1~60자, value_cm 유한 숫자 >0 및 <=500. bool/숫자문자열/NaN/무한값 거부. 같은 size+label(공백정리·casefold 기준) 중복 거부. 정밀도는 입력값을 유지한다. 치수 단위 cm는 고정이며 측정 부위는 사용자가 명시한다.
- details 및 각 측정 행 extra 필드 거부. 모든 자식 필드 기본값 빈문자열/빈배열. 객체 자체 null 거부. 전체 details 생략은 신규에서 빈값, 수정에서 기존값 보존. 명시 빈 객체는 전체 상세정보 해제.
- 기존 상품 PUT 버전으로 기본정보+details를 한 트랜잭션 저장. 별도 API/권한 확장 없음. 비인증401/미존재404/버전409/유효성422 유지.
- 저장 응답/관리 목록/고객 응답은 정규화된 details를 포함. 공개 여부 조건은 기존 유지. 미입력 상세 정보를 게시의 새 필수조건으로 만들지 않는다. 공개 응답은 기존 allowlist에 details만 추가.
- schema16→17 products.details TEXT NOT NULL DEFAULT '{}' 추가. v16 파일은 변경 전 .pre-v17-UUID.bak로 SQLite backup. 기존 값/가격/옵션/원장 보존. 과거 코드16은17을 거부하므로 단순 소스 롤백 대신17호환 수정 또는 백업+이후 기록 대사 필요.
- UI: 기본정보 탭의 기존 저장 버튼으로 함께 저장. 등록도 같은 입력 제공. 실측 반복 행 추가/삭제. 고객은 입력된 섹션만 표시하며 실측은 사이즈×부위 표로 정리, 빈 조합은 —. 고객 CSS 독립, 모바일 표 가로 스크롤.
