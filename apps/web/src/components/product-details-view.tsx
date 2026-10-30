import type {ProductDetails} from '@/lib/product-details';
import './product-details-view.css';

export function ProductDetailsView({details}:{details?:ProductDetails}) {
 if(!details||(!details.material_info&&!details.care_instructions&&!details.measurement_note&&!details.measurements.length))return null;
 const labels=[...new Set(details.measurements.map(m=>m.label))];
 const sizes=[...new Set(details.measurements.map(m=>m.size))];
 return <section className="product-details-view" aria-label="소재·실측·세탁 상세 정보">
  {details.material_info&&<section><h2>소재·혼용률</h2><p>{details.material_info}</p></section>}
  {(details.measurements.length>0||details.measurement_note)&&<section><h2>사이즈·실측 안내</h2>{details.measurements.length>0&&<><p className="product-measurement-unit">단위: cm</p><div className="product-measurement-scroll" role="region" aria-label="사이즈별 실측표" tabIndex={0}><table><caption className="sr-only">사이즈별 측정 부위 실측값 (cm)</caption><thead><tr><th scope="col">사이즈</th>{labels.map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{sizes.map(size=><tr key={size}><th scope="row">{size}</th>{labels.map(label=><td key={label}>{details.measurements.find(m=>m.size===size&&m.label===label)?.value_cm??'—'}</td>)}</tr>)}</tbody></table></div></>}{details.measurement_note&&<p>{details.measurement_note}</p>}</section>}
  {details.care_instructions&&<section><h2>세탁·관리 안내</h2><p>{details.care_instructions}</p></section>}
 </section>;
}
