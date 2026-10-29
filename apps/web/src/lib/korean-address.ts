export type KoreanAddress = {postal_code:string;address:string};
export function parseKoreanAddress(value:unknown):KoreanAddress {
 if(!value||typeof value!=='object')throw Error('Invalid address result');
 const data=value as Record<string,unknown>;
 const address=data.userSelectedType==='R'?data.roadAddress:data.userSelectedType==='J'?data.jibunAddress:undefined;
 if(typeof data.zonecode!=='string'||!/^\d{5}$/.test(data.zonecode)||typeof address!=='string'||!address.trim()||[...address].length>240)throw Error('Invalid address result');
 return {postal_code:data.zonecode,address:address.trim()};
}
