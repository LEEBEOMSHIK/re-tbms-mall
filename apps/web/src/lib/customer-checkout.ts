import {parseCart,type Cart} from './customer-shopping.ts';
export type Shipping={recipient:string;phone:string;postal_code:string;address:string;address_detail:string;memo:string};
export type Checkout=Cart&{id:string;status:'draft';shipping:Shipping|null;shipping_fee:number|null;grand_total:null;delivery_status:'address_required'|'restricted'|'verification_required';payment_enabled:false;created_at:number;updated_at:number};
export const emptyShipping:Shipping={recipient:'',phone:'',postal_code:'',address:'',address_detail:'',memo:''};
export function phoneDigits(value:string){return value.replace(/[^0-9]/g,'').slice(0,11);}
export function pastePhoneDigits(value:string,text:string,start:number,end:number){
 const before=value.slice(0,start),after=value.slice(end);
 return before+phoneDigits(text).slice(0,Math.max(0,11-before.length-after.length))+after;
}
export function shippingFieldError(key:keyof Shipping,value:string):string{
 const labels:Record<keyof Shipping,string>={recipient:'받는 분',phone:'연락처',postal_code:'우편번호',address:'주소',address_detail:'상세 주소',memo:'배송 요청사항'};
 if(key!=='memo'&&!value.trim())return `${labels[key]} 항목을 입력해 주세요.`;
 if(/[\x00-\x1f\x7f]/.test(value))return '줄바꿈이나 제어 문자는 입력할 수 없어요.';
 if(key==='phone'&&!/^0\d{8,10}$/.test(value.trim().replace(/[- ]/g,'')))return '연락처를 확인해 주세요. 예: 010-1234-5678';
 if(key==='postal_code'&&!/^[0-9]{5}$/.test(value))return '우편번호 5자리를 입력해 주세요.';
 if(key==='address'&&value.trim().length<5)return '기본 주소를 5자 이상 입력하거나 주소 검색을 이용해 주세요.';
 const max={recipient:50,phone:20,postal_code:5,address:200,address_detail:100,memo:200}[key];
 return value.length>max?`${labels[key]} 항목은 ${max}자 이내로 입력해 주세요.`:'';
}
export function parseCheckout(value:unknown):Checkout{
 if(!value||typeof value!=='object')throw Error('Invalid checkout');
 const v=value as Record<string,unknown>, cart=parseCart(value);
 if(typeof v.id!=='string'||!/^[a-f0-9-]{36}$/.test(v.id)||v.status!=='draft'||v.payment_enabled!==false||v.grand_total!==null||!['address_required','restricted','verification_required'].includes(String(v.delivery_status))||typeof v.created_at!=='number'||typeof v.updated_at!=='number')throw Error('Invalid checkout');
 let shipping:Shipping|null=null;
 if(v.shipping!==null){if(!v.shipping||typeof v.shipping!=='object')throw Error('Invalid shipping');const s=v.shipping as Record<string,unknown>;shipping={...emptyShipping};for(const key of Object.keys(shipping) as (keyof Shipping)[]){if(typeof s[key]!=='string'||s[key].length>200)throw Error('Invalid shipping');shipping[key]=s[key] as string;}}
 if(v.shipping_fee!==null&&(!Number.isSafeInteger(v.shipping_fee)||![0,3000].includes(Number(v.shipping_fee))))throw Error('Invalid shipping fee');
 return {...cart,id:v.id,status:'draft',shipping,shipping_fee:v.shipping_fee as number|null,grand_total:null,delivery_status:v.delivery_status as Checkout['delivery_status'],payment_enabled:false,created_at:v.created_at,updated_at:v.updated_at};
}
export function parseCheckouts(value:unknown){if(!value||typeof value!=='object'||!Array.isArray((value as {checkouts?:unknown}).checkouts))throw Error('Invalid checkouts');return ((value as {checkouts:unknown[]}).checkouts).map(parseCheckout);}
