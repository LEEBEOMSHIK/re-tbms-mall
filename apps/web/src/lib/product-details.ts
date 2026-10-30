export type SizeMeasurement={size:string;label:string;value_cm:number};
export type ProductDetails={material_info:string;care_instructions:string;measurement_note:string;measurements:SizeMeasurement[]};
export const emptyProductDetails=():ProductDetails=>({material_info:'',care_instructions:'',measurement_note:'',measurements:[]});
function record(value:unknown,allowed:string[]) {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw Error('상품 상세 정보 형식을 확인해 주세요.');
 return value as Record<string,unknown>;
}
function text(value:unknown,max:number,required=false) {
 if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw Error(`상세 정보의 입력 길이와 필수값을 확인해 주세요. (최대 ${max}자)`);
 return value.trim();
}
export function parseProductDetails(value:unknown):ProductDetails {
 if(value===undefined)return emptyProductDetails();
 const d=record(value,['material_info','care_instructions','measurement_note','measurements']);
 const raw=d.measurements===undefined?[]:d.measurements;
 if(!Array.isArray(raw)||raw.length>100)throw Error('실측은 최대 100개까지 입력할 수 있습니다.');
 const seen=new Set<string>();
 const measurements=raw.map(value=>{
  const m=record(value,['size','label','value_cm']);
  const size=text(m.size,40,true),label=text(m.label,60,true),value_cm=m.value_cm;
  if(typeof value_cm!=='number'||!Number.isFinite(value_cm)||value_cm<=0||value_cm>500)throw Error('실측값은 0보다 크고 500 이하인 cm 값으로 입력해 주세요.');
  const key=JSON.stringify([size.toLocaleLowerCase(),label.toLocaleLowerCase()]);
  if(seen.has(key))throw Error('같은 사이즈의 같은 측정 부위는 한 번만 입력해 주세요.');
  seen.add(key);return {size,label,value_cm};
 });
 return {material_info:text(d.material_info===undefined?'':d.material_info,1000),care_instructions:text(d.care_instructions===undefined?'':d.care_instructions,2000),measurement_note:text(d.measurement_note===undefined?'':d.measurement_note,1000),measurements};
}
