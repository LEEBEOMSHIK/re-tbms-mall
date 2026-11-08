export const inquiryCategories={product:'상품',order:'주문',shipping:'배송',returns:'교환·반품',other:'기타'};
export type Inquiry={id:string;category:keyof typeof inquiryCategories;title:string;content:string;answer:string|null;status:'waiting'|'answered';version:number;created_at:string;updated_at:string};
export function parseInquiry(value:unknown,summary=false):Inquiry {
 if(!value||typeof value!=='object')throw Error('Invalid inquiry');const v=value as Inquiry;
 if(typeof v.id!=='string'||!/^[a-f0-9-]{36}$/.test(v.id)||!Object.hasOwn(inquiryCategories,v.category)||typeof v.title!=='string'||v.title.length>150||!['waiting','answered'].includes(v.status)||!Number.isSafeInteger(v.version)||v.version<1||typeof v.created_at!=='string'||typeof v.updated_at!=='string'||(!summary&&(typeof v.content!=='string'||v.content.length>5000||(v.answer!==null&&typeof v.answer!=='string'))))throw Error('Invalid inquiry');
 return {id:v.id,category:v.category,title:v.title,content:summary?'':v.content,answer:summary?null:v.answer,status:v.status,version:v.version,created_at:v.created_at,updated_at:v.updated_at};
}
export function parseInquiryList(value:unknown){const v=value as {items:unknown[];total:number;page:number};if(!v||!Array.isArray(v.items)||v.items.length>20||!Number.isSafeInteger(v.total)||v.total<0||!Number.isSafeInteger(v.page)||v.page<1)throw Error('Invalid inquiries');return {items:v.items.map(x=>parseInquiry(x,true)),total:v.total,page:v.page};}
