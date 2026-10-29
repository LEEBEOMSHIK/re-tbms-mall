import {MATERIALS,type DesignDocument,type MaterialId} from './model';
export function materialLabel(id:MaterialId){return MATERIALS.find(m=>m.id===id)?.name??id;}
const descriptions:Record<MaterialId,string>={cotton:'면 저지 스캔 · 잔잔한 조직과 무광 표면',wool:'참고사진 기반 울 스토키네트 조직 · V자 편직과 꼬인 실의 표면 (실측 스캔 아님)',polyester:'운동복용 인터록 조직 기반 PBR · 미세한 니트와 방향성 반사 (실측 스캔 아님)',sweat:'니트 플리스 스캔 · 조밀한 편직과 포근한 무광 표면'};
export function MaterialInfo({document:doc}:{document:DesignDocument}){
 return <div className="designer-material-info" aria-label="현재 원단 표현"><strong>현재 원단 표면: {materialLabel(doc.material_id)} · 광택 {Math.round(doc.gloss*100)}%</strong><p>{descriptions[doc.material_id]} · 2D와 3D에 동일하게 적용</p><p>실제 제작 원단의 혼용률·중량·두께는 미등록입니다. 스웨트는 섬유명이 아닌 편직 원단 유형입니다.</p></div>;
}
