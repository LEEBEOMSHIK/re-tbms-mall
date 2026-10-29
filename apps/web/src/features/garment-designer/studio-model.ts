import type {DesignDocument, MaterialId, TemplateId, SurfaceId} from './model';
export interface StudioSettings {garment:TemplateId;garmentFit:'female'|'male'|'unisex';garmentSize:'S'|'M'|'L'|'XL';hoodFabric:'terry'|'brushed';fabric:MaterialId;color:string;background:string;wrinkles:boolean;ruler:boolean;light:'studio'|'raking';auto:boolean}
export interface StudioArtwork {id:number;side:SurfaceId;name:string;art:'type'|'graphic'|'upload'|'none';size:number;horizontal:number;wrapHorizontal?:number;vertical:number;angle:number;asset_id?:string;sourceBlob?:Blob|null}
export interface StudioState {version:2;settings:StudioSettings;designs:StudioArtwork[];activeId:number|null;editSide:SurfaceId}
export function studioDocument(studio:StudioState, gloss=.15):DesignDocument {
 const designs=studio.designs.map(d=>({id:d.id,side:d.side,name:d.name,art:d.art,size:d.size,horizontal:d.horizontal,vertical:d.vertical,angle:d.angle,...(d.wrapHorizontal===undefined?{}:{wrapHorizontal:d.wrapHorizontal}),...(d.art==='upload'&&d.asset_id?{asset_id:d.asset_id}:{})}));
 return {schema_version:2,template_id:studio.settings.garment,template_version:1,material_id:studio.settings.fabric,material_version:1,base_color:studio.settings.color,gloss,decorations:[],studio:{version:2,settings:{...studio.settings},designs,activeId:studio.activeId,editSide:studio.editSide}};
}
function canonical(value:unknown):unknown {
 if(Array.isArray(value))return value.map(canonical);
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
 return value;
}
export function studioKey(studio:StudioState){return JSON.stringify(canonical(studioDocument(studio).studio));}
