import {parseProductDetails,type ProductDetails} from './product-details.ts';
import {adminAuthFetch} from './admin-auth-fetch.ts';
export const supplierDetailLimits = { english_name:120, representative_name:80, phone:40, business_number:40, contact_name:80, contact_phone:40, email:254, country_code:2, region:120, city:120, postal_code:20, address:240, address_detail:240, memo:1000 } as const;
export type SupplierDetails = Record<keyof typeof supplierDetailLimits,string>;
export type Supplier=SupplierDetails&{id:string;name:string;is_active:boolean;version:number};
export type CatalogCategory={id:string;name:string;code:string;parent_id:string|null;is_active:boolean;sort_order:number;version:number};
export const seasonCodes=['SP','SU','FA','WI','ALL'] as const;
export type SeasonCode=typeof seasonCodes[number];
export type SeasonOption={code:SeasonCode;label:string};
export type ProductDraft={details?:ProductDetails;publication_status?:'draft'|'published'|'paused';publication_can_publish?:boolean;publication_visible?:boolean;publication_reasons?:string[];id:string;name:string;internal_name:string;category_id:string;category:string;seasons:SeasonCode[];description:string;version:number};
export type OptionValue={id:string;kind:"color"|"size";name:string;code:string;is_active:boolean;sort_order:number;version:number};
export type CatalogSku={is_active:boolean;color_id?:string;size_id?:string;id:string;product_id:string;code:string;color:string;size:string;reorder_point:number;on_hand:number;version:number};
export const movementReasonLabels={receipt:"입고",sale:"판매",gift:"증정 (지인 제공 포함)",disposal:"불량·폐기",other_out:"기타 출고",adjust_in:"재고 증가 조정",adjust_out:"재고 감소 조정",legacy:"기존 기록 (미분류)"} as const;
export type MovementReasonCode=keyof typeof movementReasonLabels;
export type Movement={supplier_id?:string|null;supplier_name?:string|null;reason_code?:MovementReasonCode;id:string;sku_id:string;delta:number;reason:string;actor:string;created_at:string;balance_after:number;request_id:string};
export type ProductReadiness={product_id:string;status:'no_options'|'no_stock'|'partial_stock'|'in_stock';sku_count:number;stocked_sku_count:number;total_on_hand:number};
export type Catalog={country_codes?:string[];suppliers?:Supplier[];option_values?:OptionValue[];product_readiness?:ProductReadiness[];mode:'local';categories:CatalogCategory[];season_options:SeasonOption[];products:ProductDraft[];skus:CatalogSku[];movements:Movement[]};
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid catalog');return v as Record<string,unknown>;};
const str=(v:unknown,empty=false):string=>{if(typeof v!=='string'||(!empty&&!v.trim()))throw Error('Invalid text');return v;};
const int=(v:unknown,min=0):number=>{if(!Number.isSafeInteger(v)||Number(v)<min)throw Error('Invalid number');return Number(v);};
export function parseSupplier(v:unknown):Supplier{
  const s=obj(v);if(typeof s.is_active!=='boolean')throw Error('Invalid supplier');
  const details = {} as SupplierDetails;
  for(const [key, limit] of Object.entries(supplierDetailLimits)){
    const value=s[key]===undefined?'':s[key];
    if(typeof value!=='string'||[...value].length>limit)throw Error('Invalid supplier detail');
    details[key as keyof SupplierDetails]=value;
  }
  if(details.country_code!==''&&!/^[A-Z]{2}$/.test(details.country_code))throw Error('Invalid supplier country');
  return{...details,id:str(s.id),name:str(s.name),is_active:s.is_active,version:int(s.version)};
}
export function parseCategory(v:unknown):CatalogCategory{const c=obj(v);if(typeof c.is_active!=='boolean')throw Error('Invalid category status');return{id:str(c.id),name:str(c.name),code:str(c.code),parent_id:c.parent_id===null?null:str(c.parent_id),is_active:c.is_active,sort_order:int(c.sort_order),version:int(c.version)};}
function parseSeasons(v:unknown):SeasonCode[]{if(!Array.isArray(v)||v.some(code=>!seasonCodes.includes(code))||new Set(v).size!==v.length||(v.includes('ALL')&&v.length>1))throw Error('Invalid seasons');const ordered=seasonCodes.filter(code=>v.includes(code));if(ordered.some((code,index)=>code!==v[index]))throw Error('Invalid season order');return ordered;}
export function parseProduct(v:unknown):ProductDraft{const p=obj(v);const publication=p.publication_status===undefined?{}:{publication_status:(['draft','published','paused'].includes(String(p.publication_status))?p.publication_status:(()=>{throw Error('Invalid publication status')})()) as 'draft'|'published'|'paused',publication_can_publish:p.publication_can_publish===true,publication_visible:p.publication_visible===true,publication_reasons:Array.isArray(p.publication_reasons)?p.publication_reasons.map(r=>str(r)):[]};return{...publication,details:parseProductDetails(p.details),id:str(p.id),name:str(p.name),internal_name:str(p.internal_name),category_id:str(p.category_id),category:str(p.category),seasons:parseSeasons(p.seasons),description:str(p.description,true),version:int(p.version)};}
export function parseSku(v:unknown):CatalogSku{const s=obj(v);const active=s.is_active===undefined?true:s.is_active;if(typeof active!=='boolean')throw Error('Invalid SKU usage status');const references=s.color_id===undefined&&s.size_id===undefined?{}:{color_id:str(s.color_id),size_id:str(s.size_id)};return{...references,is_active:active,id:str(s.id),product_id:str(s.product_id),code:str(s.code),color:str(s.color),size:str(s.size),reorder_point:int(s.reorder_point),on_hand:int(s.on_hand),version:int(s.version)};}
export function parseMovement(v:unknown):Movement{const m=obj(v);const code=m.reason_code??"legacy";if(!Object.hasOwn(movementReasonLabels,code as string)||m.reason_code===null)throw Error("Invalid movement reason");const delta=int(m.delta,-1000000);if(delta===0||((code==='receipt'||code==='adjust_in')&&delta<0)||(['sale','gift','disposal','other_out','adjust_out'].includes(code as string)&&delta>0)||!Number.isFinite(Date.parse(str(m.created_at))))throw Error('Invalid movement');const supplier_id=m.supplier_id==null?null:str(m.supplier_id);const supplier_name=m.supplier_name==null?null:str(m.supplier_name);if((supplier_id===null)!==(supplier_name===null)||(supplier_id&&code!=='receipt'))throw Error('Invalid movement supplier');return{supplier_id,supplier_name,reason_code:code as MovementReasonCode,id:str(m.id),sku_id:str(m.sku_id),delta,reason:str(m.reason,true),actor:str(m.actor),created_at:str(m.created_at),balance_after:int(m.balance_after),request_id:str(m.request_id)};}
function list<T extends {id:string}>(v:unknown,parse:(v:unknown)=>T):T[]{if(!Array.isArray(v))throw Error('Invalid list');const rows=v.map(parse);if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Duplicate ID');return rows;}
export function parseCatalog(v:unknown):Catalog {
  const c=obj(v);
  if(c.mode!=='local')throw Error('Invalid mode');
  const categories=list(c.categories,parseCategory),products=list(c.products,parseProduct),skus=list(c.skus,parseSku),movements=list(c.movements,parseMovement);
  if(!Array.isArray(c.season_options))throw Error('Invalid season options');
  const season_options=c.season_options.map(value=>{const option=obj(value);if(!seasonCodes.includes(option.code as SeasonCode))throw Error('Invalid season option');return{code:option.code as SeasonCode,label:str(option.label)};});
  if(season_options.length!==seasonCodes.length||season_options.some((option,index)=>option.code!==seasonCodes[index]))throw Error('Invalid season options');
  if(new Set(categories.map(category=>category.code)).size!==categories.length)throw Error('Duplicate category code');
  if(new Set(products.map(product=>product.internal_name)).size!==products.length)throw Error('Duplicate internal name');
  if(categories.some(category=>category.parent_id!==null&&!categories.some(parent=>parent.id===category.parent_id&&parent.parent_id===null)))throw Error('Broken category hierarchy');
  if(products.some(product=>!categories.some(category=>category.id===product.category_id&&category.name===product.category))||skus.some(s=>!products.some(p=>p.id===s.product_id))||movements.some(m=>!skus.some(s=>s.id===m.sku_id)))throw Error('Broken relation');
  const readiness=c.product_readiness===undefined?undefined:parseProductReadiness(c.product_readiness,products.map(p=>p.id));
  const optionValues=c.option_values===undefined?undefined:list(c.option_values,parseOptionValue);
  if(optionValues){if(new Set(optionValues.map(v=>v.kind+':'+v.code)).size!==optionValues.length)throw Error('Duplicate option code');if(skus.some(s=>(s.color_id!==undefined&&!optionValues.some(v=>v.id===s.color_id&&v.kind==='color'))||(s.size_id!==undefined&&!optionValues.some(v=>v.id===s.size_id&&v.kind==='size'))))throw Error('Broken option reference');}
  if(c.country_codes!==undefined&&!Array.isArray(c.country_codes))throw Error('Invalid country codes');
  const countryCodes = c.country_codes === undefined ? undefined : (c.country_codes as unknown[]).map(value => { const code=str(value); if(!/^[A-Z]{2}$/.test(code))throw Error('Invalid country code'); return code; });
  if(countryCodes && new Set(countryCodes).size !== countryCodes.length)throw Error('Duplicate country code');
  return{...(countryCodes !== undefined ? {country_codes:countryCodes} : {}),...(c.suppliers!==undefined?{suppliers:list(c.suppliers,parseSupplier)}:{}),mode:'local',categories,season_options,products,skus,movements,...(optionValues!==undefined?{option_values:optionValues}:{}),...(readiness!==undefined?{product_readiness:readiness}:{})};
}
export function toggleSeason(current:SeasonCode[],code:SeasonCode):SeasonCode[]{
  if(current.includes(code))return current.filter(item=>item!==code);
  if(code==='ALL')return['ALL'];
  const selected=seasonCodes.filter(item=>item!=='ALL'&&(item===code||current.includes(item)));
  return selected.length===4?['ALL']:selected;
}
export function categoryPath(categories:CatalogCategory[],categoryId:string):string{
  const category=categories.find(item=>item.id===categoryId);
  if(!category)return '분류 확인 필요';
  const parent=categories.find(item=>item.id===category.parent_id);
  return parent?`${parent.name} > ${category.name}`:`${category.name} · 세부 분류 미지정`;
}
export function internalNamePreview(categories:CatalogCategory[],categoryId:string,seasons:SeasonCode[]):string{
  const child=categories.find(item=>item.id===categoryId);
  const root=categories.find(item=>item.id===child?.parent_id);
  return child&&root&&seasons.length?`${root.code}-${child.code}-${seasons.join('')}-자동 생성`:'세부 카테고리와 계절 선택 후 자동 생성';
}
export type CatalogFailure='auth'|'conflict'|'validation'|'missing'|'unavailable';
export type Result<T>={ok:true;data:T}|{ok:false;reason:CatalogFailure};
export async function catalogRequest<T>(path:string,parse:(v:unknown)=>T,options:{method?:'GET'|'POST'|'PUT'|'DELETE';body?:unknown;fetcher?:typeof fetch;signal?:AbortSignal}={}):Promise<Result<T>>{
  try{const response=await(options.fetcher||adminAuthFetch)(path,{method:options.method||'GET',credentials:'same-origin',cache:'no-store',signal:options.signal||AbortSignal.timeout(15000),...(options.body!==undefined?{headers:{'Content-Type':'application/json'},body:JSON.stringify(options.body)}:{})});
    if(!response.ok)return{ok:false,reason:response.status===401?'auth':response.status===409?'conflict':response.status===422?'validation':response.status===404?'missing':'unavailable'};
    return{ok:true,data:parse(await response.json())};
  }catch{return{ok:false,reason:'unavailable'};}
}
export type MovementInput={supplier_id?:string|null;sku_id:string;delta:number;reason:string;reason_code?:MovementReasonCode};
export type MovementRequest=MovementInput&{version:number;request_id:string};
export function movementRequest(previous:MovementRequest|null,input:MovementInput,version:number,newId:()=>string):MovementRequest{
  const normalized={...input,reason:input.reason.trim()};
  if(previous&&(previous.supplier_id??null)===(normalized.supplier_id??null)&&previous.sku_id===normalized.sku_id&&previous.delta===normalized.delta&&previous.reason===normalized.reason&&(previous.reason_code??"legacy")===(normalized.reason_code??"legacy"))return previous;
  return{...normalized,version,request_id:newId()};
}

export function parseProductDeletion(value:unknown):{id:string;deleted:true}{
  const result=obj(value);if(result.deleted!==true)throw new Error("Invalid deletion confirmation");
  return{id:str(result.id),deleted:true};
}

export function parseProductReadiness(value:unknown,productIds:string[]):ProductReadiness[]{
  if(!Array.isArray(value))throw Error('Invalid readiness');
  const seen=new Set<string>();
  const rows=value.map(raw=>{
    const row=obj(raw),product_id=str(row.product_id),sku_count=int(row.sku_count),stocked_sku_count=int(row.stocked_sku_count),total_on_hand=int(row.total_on_hand);
    if(seen.has(product_id)||!productIds.includes(product_id)||stocked_sku_count>sku_count||total_on_hand<stocked_sku_count||total_on_hand>stocked_sku_count*1000000)throw Error('Invalid readiness counts');
    seen.add(product_id);
    const status=row.status;
    if(!((status==='no_options'&&sku_count===0)||(status==='no_stock'&&sku_count>0&&stocked_sku_count===0)||(status==='partial_stock'&&stocked_sku_count>0&&stocked_sku_count<sku_count)||(status==='in_stock'&&sku_count>0&&stocked_sku_count===sku_count)))throw Error('Invalid readiness state');
    return{product_id,status,sku_count,stocked_sku_count,total_on_hand} as ProductReadiness;
  });
  if(seen.size!==productIds.length)throw Error('Missing readiness');
  return rows;
}

export function parseOptionValue(value:unknown):OptionValue{
  const v=obj(value),kind=v.kind,name=str(v.name),code=str(v.code),sort_order=int(v.sort_order),version=int(v.version);
  if((kind!=='color'&&kind!=='size')||typeof v.is_active!=='boolean'||[...name].length>80||!/^[A-Z0-9]{1,12}$/.test(code)||sort_order>10000||version>2147483647)throw Error('Invalid option value');
  return{id:str(v.id),kind,name,code,is_active:v.is_active,sort_order,version};
}


export type SkuBatchInput={product_id:string;color_ids:string[];size_ids:string[];reorder_point:number};
export type SkuBatchResult={created:CatalogSku[];existing:CatalogSku[]};
export function parseSkuBatch(value:unknown,request?:SkuBatchInput):SkuBatchResult{
  const data=obj(value),created=list(data.created,parseSku),existing=list(data.existing,parseSku),all=[...created,...existing];
  if(!all.length||all.length>200||new Set(all.map(s=>s.id)).size!==all.length||new Set(all.map(s=>s.code)).size!==all.length||new Set(all.map(s=>s.product_id)).size!==1||all.some(s=>!s.color_id||!s.size_id)||new Set(all.map(s=>s.color_id+':'+s.size_id)).size!==all.length||created.some(s=>s.on_hand!==0||s.version!==0))throw Error('Invalid batch confirmation');
  if(request&&(all.length!==request.color_ids.length*request.size_ids.length||all.some(s=>s.product_id!==request.product_id||!request.color_ids.includes(s.color_id!)||!request.size_ids.includes(s.size_id!))||created.some(s=>s.reorder_point!==request.reorder_point)))throw Error('Incomplete batch confirmation');
  return{created,existing};
}

export type SelectedSkuBatchInput={product_id:string;items:{color_id:string;size_id:string;initial_stock:number;reorder_point?:number}[];reorder_point?:number};
export function parseSelectedSkuBatch(value:unknown,request?:SelectedSkuBatchInput):SkuBatchResult{
  const data=obj(value),created=list(data.created,parseSku),existing=list(data.existing,parseSku),all=[...created,...existing];
  if(!all.length||all.length>200||new Set(all.map(s=>s.id)).size!==all.length||new Set(all.map(s=>s.code)).size!==all.length||new Set(all.map(s=>s.product_id)).size!==1||all.some(s=>!s.color_id||!s.size_id)||new Set(all.map(s=>s.color_id+':'+s.size_id)).size!==all.length||created.some(s=>s.on_hand>1000000||s.version!==(s.on_hand>0?1:0)))throw Error('Invalid selected batch');
  if(request&&(all.length!==request.items.length||all.some(s=>s.product_id!==request.product_id||!request.items.some(i=>i.color_id===s.color_id&&i.size_id===s.size_id))||created.some(s=>{const item=request.items.find(i=>i.color_id===s.color_id&&i.size_id===s.size_id);return s.reorder_point!==(item?.reorder_point??request.reorder_point??0)||s.on_hand!==item?.initial_stock;})))throw Error('Incomplete selected batch');
  return{created,existing};
}


export function parseMovementConfirmation(value:unknown,request:MovementRequest):Movement{
 const result=parseMovement(value);
 if((result.supplier_id??null)!==(request.supplier_id??null)||(result.reason_code??"legacy")!==(request.reason_code??"legacy")||result.sku_id!==request.sku_id||result.request_id!==request.request_id||result.delta!==request.delta||result.reason!==request.reason.trim()||result.balance_after<0||result.balance_after>1000000||result.balance_after-result.delta<0||result.balance_after-result.delta>1000000)throw Error('Invalid movement confirmation');
 return result;
}




