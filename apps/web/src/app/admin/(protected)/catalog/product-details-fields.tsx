import {useRef} from 'react';
import {FormLabel} from '@/components/ui/form-controls';
import type {ProductDetails} from '@/lib/product-details';

export function ProductDetailsFields({value,onChange}:{value:ProductDetails;onChange:(value:ProductDetails)=>void}) {
 const addButton=useRef<HTMLButtonElement>(null);
 const changeMeasurement=(index:number,field:'size'|'label'|'value_cm',next:string|number)=>onChange({...value,measurements:value.measurements.map((row,i)=>i===index?{...row,[field]:next}:row)});
 return <section className="product-details-fields catalog-field-wide" aria-labelledby="product-details-title">
  <h3 id="product-details-title">고객용 상세 정보</h3>
  <p className="catalog-note">선택 입력입니다. 입력한 내용은 고객 상품 상세에 표시됩니다. 기본정보 저장 버튼으로 함께 저장합니다.</p>
  <div className="catalog-field"><FormLabel htmlFor="product-material" hint="선택">소재·혼용률</FormLabel><textarea id="product-material" rows={3} maxLength={1000} placeholder="예: 면 100% (실제 상품 정보를 입력하세요)" value={value.material_info} onChange={e=>onChange({...value,material_info:e.target.value})}/></div>
  <div className="catalog-field"><FormLabel htmlFor="product-care" hint="선택">세탁·관리 안내</FormLabel><textarea id="product-care" rows={4} maxLength={2000} value={value.care_instructions} onChange={e=>onChange({...value,care_instructions:e.target.value})}/></div>
  <div className="product-measurements-heading"><h4>사이즈별 실측</h4><span className="catalog-note">단위 cm · {value.measurements.length}/100</span></div>
  <p className="catalog-note">사이즈와 측정 부위를 직접 입력하세요. 예: M / 가슴 단면 / 52.5. 실제 색상·사이즈 옵션이나 재고는 변경되지 않습니다.</p>
  {value.measurements.map((row,index)=><div className="product-measurement-row" key={index}>
   <div><FormLabel htmlFor={`measurement-size-${index}`} required>사이즈</FormLabel><input id={`measurement-size-${index}`} required maxLength={40} value={row.size} onChange={e=>changeMeasurement(index,'size',e.target.value)}/></div>
   <div><FormLabel htmlFor={`measurement-label-${index}`} required>측정 부위</FormLabel><input id={`measurement-label-${index}`} required maxLength={60} placeholder="예: 총장, 허리 단면" value={row.label} onChange={e=>changeMeasurement(index,'label',e.target.value)}/></div>
   <div><FormLabel htmlFor={`measurement-value-${index}`} required>실측 (cm)</FormLabel><input id={`measurement-value-${index}`} type="number" inputMode="decimal" min="0" max="500" step="any" required value={row.value_cm===0?'':row.value_cm} onChange={e=>changeMeasurement(index,'value_cm',e.target.value===''?0:Number(e.target.value))}/></div>
   <button type="button" aria-label={`${index+1}번째 실측 삭제`} onClick={()=>{onChange({...value,measurements:value.measurements.filter((_,i)=>i!==index)});addButton.current?.focus();}}>삭제</button>
  </div>)}
  <button ref={addButton} type="button" className="product-measurement-add" disabled={value.measurements.length>=100} onClick={()=>{const index=value.measurements.length;onChange({...value,measurements:[...value.measurements,{size:'',label:'',value_cm:0}]});requestAnimationFrame(()=>document.getElementById(`measurement-size-${index}`)?.focus());}}>실측 항목 추가</button>
  <div className="catalog-field"><FormLabel htmlFor="product-measurement-note" hint="선택">측정 방법·참고사항</FormLabel><textarea id="product-measurement-note" rows={3} maxLength={1000} value={value.measurement_note} onChange={e=>onChange({...value,measurement_note:e.target.value})}/></div>
 </section>;
}
