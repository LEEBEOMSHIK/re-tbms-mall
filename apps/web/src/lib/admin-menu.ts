export const MENU_ITEMS = [
  {id:'home',label:'관리자 홈',href:'/admin'},
  {id:'catalog',label:'상품 관리',href:'/admin/catalog'},
  {id:'inventory',label:'재고 관리',href:'/admin/catalog/inventory'},
  {id:'factories',label:'공장 협업',href:'/admin/factories'},
  {id:'designs',label:'의류 디자인',href:'/admin/designs'},
  {id:'site',label:'사이트 관리',href:'/admin/site'},
  {id:'reviews',label:'리뷰 관리',href:'/admin/reviews'},
  {id:'payment-preparation',label:'PG 도입 준비',href:'/admin/payment-preparation'},
  {id:'workboard',label:'작업 보드',href:'/admin/workboard'},
] as const;
export type MenuId = typeof MENU_ITEMS[number]['id'];
export type AdminMenuItem = {id:MenuId;visible:boolean};
export type AdminMenuGroup = {id:string;label:string;visible:boolean;items:AdminMenuItem[]};
export type AdminMenuState = {revision:number;groups:AdminMenuGroup[]};
const group = (id:string,label:string,ids:MenuId[]):AdminMenuGroup => ({id,label,visible:true,items:ids.map(id=>({id,visible:true}))});
export const DEFAULT_ADMIN_MENU:AdminMenuState = {revision:0,groups:[
  group('operations','운영',['home','catalog','inventory']),
  group('production','제작·협업',['factories','designs']),
  group('site-customer','사이트·고객',['site','reviews']),
  group('project','프로젝트',['workboard','payment-preparation']),
]};
function object(value:unknown,keys:string[]):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid menu object');
  if(Object.keys(value).length!==keys.length||Object.keys(value).some(key=>!keys.includes(key)))throw Error('Invalid menu fields');
  return value as Record<string,unknown>;
}
function boolean(value:unknown):boolean {if(typeof value!=='boolean')throw Error('Invalid visibility');return value;}
export function parseAdminMenu(value:unknown):AdminMenuState {
  const v=object(value,['revision','groups']);
  if(typeof v.revision!=='number'||!Number.isSafeInteger(v.revision)||v.revision<0||v.revision>Number.MAX_SAFE_INTEGER-1)throw Error('Invalid revision');
  if(!Array.isArray(v.groups)||v.groups.length<1||v.groups.length>8)throw Error('Invalid groups');
  const groups=v.groups.map(raw=>{
    const g=object(raw,['id','label','visible','items']);
    if(typeof g.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(g.id))throw Error('Invalid group ID');
    if(typeof g.label!=='string'||!g.label.trim()||[...g.label.trim()].length>40)throw Error('Invalid group label');
    if(!Array.isArray(g.items)||g.items.length>9)throw Error('Invalid items');
    const items=g.items.map(raw=>{
      const item=object(raw,['id','visible']);
      if(!MENU_ITEMS.some(known=>known.id===item.id))throw Error('Unknown menu');
      return {id:item.id as MenuId,visible:boolean(item.visible)};
    });
    return {id:g.id,label:g.label.trim(),visible:boolean(g.visible),items};
  });
  if(new Set(groups.map(g=>g.id)).size!==groups.length)throw Error('Duplicate group');
  const ids=groups.flatMap(g=>g.items.map(i=>i.id));
  if(ids.length!==MENU_ITEMS.length||new Set(ids).size!==MENU_ITEMS.length)throw Error('Each menu must appear exactly once');
  return {revision:v.revision,groups};
}
export function visibleMenuCount(groups:AdminMenuGroup[]):number {return groups.reduce((count,g)=>count+(g.visible?g.items.filter(i=>i.visible).length:0),0);}
export function moveMenuItem(groups:AdminMenuGroup[],itemId:MenuId,targetId:string):AdminMenuGroup[] {
  const source=groups.find(g=>g.items.some(i=>i.id===itemId));
  const target=groups.find(g=>g.id===targetId);
  if(!source||!target||source===target)return groups;
  const item=source.items.find(i=>i.id===itemId)!;
  return groups.map(g=>g.id===source.id?{...g,items:g.items.filter(i=>i.id!==itemId)}:g.id===targetId?{...g,items:[...g.items,item]}:g);
}
