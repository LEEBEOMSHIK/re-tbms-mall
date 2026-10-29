import type {StudioState} from './studio-model';
export type TemplateId = 'tshirt' | 'hoodie';
export type MaterialId = 'cotton' | 'polyester' | 'sweat' | 'wool';
export type SurfaceId = 'front' | 'back';
export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export interface Decoration { id: string; technique: 'print'; surface_id: SurfaceId; asset_id: string; center: Point; size: { width: number; height: number }; rotation_degrees: number; visible: boolean }
export interface DesignDocument { schema_version: 1 | 2; studio?: StudioState; template_id: TemplateId; template_version: 1; material_id: MaterialId; material_version: 1; base_color: string; gloss: number; decorations: Decoration[] }
export interface AssetMeta { id: string; mime: string; bytes: number }
export interface DesignRecord { id: string; name: string; version: number; document: DesignDocument; created_at: string; updated_at: string; assets: AssetMeta[] }
export const PRINT_AREAS: Record<TemplateId, Rect> = { tshirt: { x:.25,y:.24,width:.5,height:.5 }, hoodie: { x:.27,y:.26,width:.46,height:.30 } };
export const TEMPLATES = [{id:'tshirt',version:1,name:'티셔츠'},{id:'hoodie',version:1,name:'후드'}] as const;
export const MATERIALS = [{id:'cotton',version:1,name:'면 저지',roughness:.88,bumpScale:.009},{id:'polyester',version:1,name:'폴리에스터 인터록',roughness:.48,bumpScale:.003},{id:'sweat',version:1,name:'스웨트 니트 플리스',roughness:.97,bumpScale:.018},{id:'wool',version:1,name:'울 스토키네트 니트',roughness:.96,bumpScale:.025}] as const;
export function createDocument(templateId:TemplateId):DesignDocument { return {schema_version:1,template_id:templateId,template_version:1,material_id:'cotton',material_version:1,base_color:'#e8e5df',gloss:.15,decorations:[]}; }
export function decorationCorners(d:Decoration):Point[] { const angle=d.rotation_degrees*Math.PI/180;return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:d.center.x+x*d.size.width/2*Math.cos(angle)-y*d.size.height/2*Math.sin(angle),y:d.center.y+x*d.size.width/2*Math.sin(angle)+y*d.size.height/2*Math.cos(angle)})); }
export function validateDocument(d:DesignDocument):string[] {
 const errors:string[]=[];
 if(![1,2].includes(d.schema_version)||d.template_version!==1||d.material_version!==1) errors.push('지원하지 않는 문서 버전입니다.');
 if(!TEMPLATES.some(t=>t.id===d.template_id)||!MATERIALS.some(m=>m.id===d.material_id))errors.push('지원하지 않는 의류 또는 원단입니다.');
 if(!/^#[0-9a-f]{6}$/i.test(d.base_color)||!Number.isFinite(d.gloss)||d.gloss<0||d.gloss>1)errors.push('색상 또는 광택 값을 확인하세요.');
 if(!Array.isArray(d.decorations))return [...errors,'레이어 배열이 필요합니다.'];
 if(d.decorations.length>20)errors.push('나염은 최대 20개입니다.');
 if(d.schema_version===2){if(!d.studio||d.studio.version!==2||!Array.isArray(d.studio.designs)||d.decorations.length)errors.push('스튜디오 문서를 확인하세요.');return errors;}
 const ids=new Set<string>();const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 for(const layer of d.decorations){
  if(!uuid.test(layer.id)||!uuid.test(layer.asset_id)||ids.has(layer.id))errors.push('레이어 또는 이미지 ID를 확인하세요.');ids.add(layer.id);
  if(layer.technique!=='print'||!['front','back'].includes(layer.surface_id)||typeof layer.visible!=='boolean'){errors.push('지원하지 않는 나염 설정입니다.');continue;}
  if(!layer.center||!layer.size||![layer.center.x,layer.center.y,layer.size.width,layer.size.height,layer.rotation_degrees].every(Number.isFinite)||layer.size.width<=0||layer.size.height<=0||layer.size.width>1||layer.size.height>1||Math.abs(layer.rotation_degrees)>180){errors.push('나염 위치·크기·회전은 유효한 숫자여야 합니다.');continue;}
  const r=PRINT_AREAS[d.template_id];if(r&&decorationCorners(layer).some(p=>p.x<r.x-1e-9||p.y<r.y-1e-9||p.x>r.x+r.width+1e-9||p.y>r.y+r.height+1e-9))errors.push('회전된 나염 전체가 인쇄 영역 안에 있어야 합니다.');
 }
 return [...new Set(errors)];
}
export function garmentOutline(template:TemplateId):Point[] { const long=template==='hoodie';return [[.42,.12],[.30,.14],[.08,long?.39:.25],[long?.12:.16,long?.80:.39],[.25,.31],[.23,.90],[.77,.90],[.75,.31],[long?.88:.84,long?.80:.39],[.92,long?.39:.25],[.70,.14],[.58,.12],[.57,.17],[.54,.20],[.46,.20],[.43,.17]].map(([x,y])=>({x,y})); }
