import {emptyShipping,type Shipping} from './customer-checkout.ts';
export type Address={id:string;label:string;shipping:Shipping;is_default:boolean};
export type Account={version:number;profile:{name:string;phone:string};addresses:Address[];session_guard?:string};
export function savedAddress(previousIds:string[],account:Account,id?:string):Address|undefined{
 if(id)return account.addresses.find(address=>address.id===id);
 const created=account.addresses.filter(address=>!previousIds.includes(address.id));
 return created.length===1?created[0]:undefined;
}
export function newAddressShipping(account:Account):Shipping{
 const preferred=account.addresses.find(address=>address.is_default)?.shipping;
 return {...emptyShipping,recipient:preferred?.recipient??account.profile.name,phone:preferred?.phone??account.profile.phone};
}
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid account');return v as Record<string,unknown>};
const str=(v:unknown,max=200)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid text');return v};
export function parseAccount(value:unknown):Account{
 const a=object(value),p=object(a.profile);if(!Number.isSafeInteger(a.version)||Number(a.version)<0||!Array.isArray(a.addresses)||a.addresses.length>20)throw Error('Invalid account');
 const addresses=a.addresses.map(value=>{const a=object(value),s=object(a.shipping);if(typeof a.is_default!=='boolean')throw Error('Invalid default');return{id:str(a.id,36),label:str(a.label,30),is_default:a.is_default,shipping:{recipient:str(s.recipient,50),phone:str(s.phone,20),postal_code:str(s.postal_code,5),address:str(s.address),address_detail:str(s.address_detail,100),memo:str(s.memo)}}});
 if(new Set(addresses.map(a=>a.id)).size!==addresses.length||addresses.filter(a=>a.is_default).length>1)throw Error('Invalid addresses');
 return{version:Number(a.version),profile:{name:str(p.name,50),phone:str(p.phone,20)},addresses,...(a.session_guard===undefined?{}:{session_guard:str(a.session_guard,64)})};
}
