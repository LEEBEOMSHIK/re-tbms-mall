import {adminAuthFetch} from '../../lib/admin-auth-fetch.ts';
import type {DesignRecord} from './model';
export class DesignError extends Error { status:number; constructor(message:string,status:number){super(message);this.status=status;} }
export async function designRequest<T>(path='',body?:unknown,method='POST'):Promise<T>{
 const response=await adminAuthFetch(`/api/admin/designs${path}`,{cache:'no-store',...(body===undefined?{}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new DesignError(typeof data?.error==='string'?data.error:typeof data?.detail==='string'?data.detail:`요청을 처리하지 못했습니다 (${response.status}).`,response.status);
 if(data===null)throw new DesignError('응답을 확인하지 못했습니다. 같은 요청으로 다시 시도하세요.',0);
 return data as T;
}
export function assetUrls(record:DesignRecord){return Object.fromEntries(record.assets.map(a=>[a.id,`/api/admin/designs/${record.id}/assets/${a.id}`]));}
export function errorMessage(e:unknown){return e instanceof Error?e.message:'연결을 확인한 뒤 다시 시도하세요.';}
export function readFile(file:File):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('이미지를 읽지 못했습니다.'));r.readAsDataURL(file);});}
export function normalizeColorCode(value:string):string|null{return /^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():null;}
