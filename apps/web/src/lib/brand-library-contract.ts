export type LogoFile={id:string;file:string;width:number;height:number;bytes:number};
export type LogoItem=LogoFile & {asset_id:string;title:string;usage:string};
export type LogoContent={assets:LogoItem[];notes:string};
export type LogoState={revision:number;published_version:number;published_at:string;draft:LogoContent;published:LogoContent;available:LogoFile[]};
export type LogoPublished={published_version:number;published_at:string;content:LogoContent};
export const LOGO_ID=/^(?:logo_(?:long|short|icon)|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/;
function obj(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid object');return v as Record<string,unknown>;}
function text(v:unknown,max:number){if(typeof v!=='string'||!v.trim()||[...v].length>max)throw Error('Invalid text');return v;}
function num(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)throw Error('Invalid number');return v;}
export function parseLogoFile(v:unknown):LogoFile{const a=obj(v),id=text(a.id,64),file=text(a.file,100);if(!LOGO_ID.test(id)||!file.toLowerCase().endsWith('.png')||/[\\/]/.test(file))throw Error('Invalid file');return {id,file,width:num(a.width,1,4096),height:num(a.height,1,4096),bytes:num(a.bytes,1,2*1024*1024)};}
export function parseLogoContent(v:unknown):LogoContent{const a=obj(v);if(!Array.isArray(a.assets)||a.assets.length<1||a.assets.length>12)throw Error('Invalid count');const assets=a.assets.map(v=>{const o=obj(v),file=parseLogoFile(v);if(o.asset_id!==file.id)throw Error('Invalid reference');return {...file,asset_id:file.id,title:text(o.title,80),usage:text(o.usage,300)};});if(new Set(assets.map(a=>a.id)).size!==assets.length)throw Error('Duplicate logo');return {assets,notes:text(a.notes,500)};}
function meta(v:Record<string,unknown>){const published_at=text(v.published_at,50);if(!Number.isFinite(Date.parse(published_at)))throw Error('Invalid date');return {published_version:num(v.published_version,1),published_at};}
export function parseLogoState(v:unknown):LogoState{const s=obj(v);if(!Array.isArray(s.available))throw Error('Invalid files');return {...meta(s),revision:num(s.revision),draft:parseLogoContent(s.draft),published:parseLogoContent(s.published),available:s.available.map(parseLogoFile)};}
export function parseLogoPublished(v:unknown):LogoPublished{const s=obj(v);return {...meta(s),content:parseLogoContent(s.content)};}
export function logoPayload(content:LogoContent){return {notes:content.notes,assets:content.assets.map(({asset_id,title,usage})=>({asset_id,title,usage}))};}
