# 색상·사이즈 기준정보와 SKU 자동 코드

WB30 / R40 / 2026-10-26

관리자 기준정보 화면 /admin/catalog/option-values 에서 색상/사이즈 이름·코드·순서·사용여부를 관리한다. 목록새로고침과 페이지복귀/창focus 갱신을 제공한다. 옵션등록폼에서도 기준항목 빠른등록 후 해당필드를선택한다. 새SKU는상품+활성color_id+활성size_id+reorder_point만전송하며 code/color/size 자유입력은새계약에서허용하지않는다. 코드미리보기는상품내부명-colorcode-sizecode, 실제코드는서버에서발급한다. 도메인코드수정불가/이름·순서·사용여부수정가능, 삭제없음. 기존SKU코드·표시명·재고·원장은보존하고연결ID를이관한다.

API 계약: GET catalog에 option_values:[{id,kind:'color'|'size',name,code,is_active,sort_order,version}]. POST /admin/option-values body{kind,name,code,is_active,sort_order},201item. PUT /admin/option-values/{id} body{name,is_active,sort_order,version},200item. 코드[A-Z0-9]{1,12}, kind별code/name casefoldunique, sort0..10000, versionstrict. 새POSTskus{product_id,color_id,size_id,reorder_point},201SKU(기존필드+color_id,size_id). SKU조합/코드중복409, 비활성/잘못된kind422, 없는참조404. SKU코드최대 길이는구성필드에따르며code직접입력금지. 기존name snapshot보존. 새중복방지는(product_id,color_id,size_id). schema3→4 기존값별기준항목과ID연결이관, 자동기준코드는C000001/S000001 등충돌없이발급, 기존SKU코드유지. 실DB사전online backup완료(로컬검증기록참조), destructive삭제없음.

API담당: services/api 및테스트/이관. UI담당: 옵션폼·관리화면·도움말·목록/대시보드진입·공통스타일. 조정담당: TS/BFF계약·문서·브라우저/보존확인. 독립검증자: 소스/실행결과. 파일소유권과계약고정후병렬진행.

수용: 도메인생성/수정/비활성·중복/권한/경합,combobox즉시반영·빠른추가후선택·서버자동code,SKU재고0/기존원장보존,오류/모바일/키보드. 초기기준값을운영확정하지않고빈DB에서는관리자가등록한다. 가격·판매·실결제·게시기능변경없음. 롤백은앱중지후백업DB와이전코드쌍으로하며이관후쓰기데이터보존대책없이덮어쓰지않는다. 선행WB29.
