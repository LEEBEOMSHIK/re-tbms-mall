'use client';
import {useEffect,useRef,useState} from 'react';
import {parseKoreanAddress,type KoreanAddress} from '@/lib/korean-address';
import './korean-address-search.css';
type PostcodeConstructor=new(options:{oncomplete:(data:unknown)=>void;onresize?:(size:{height:number})=>void;width:string;height:string;autoMapping?:boolean})=>{embed:(element:HTMLElement,options?:{autoClose:boolean})=>void};
declare global {interface Window {kakao?:{Postcode?:PostcodeConstructor}}}
const source='https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
let scriptPromise:Promise<PostcodeConstructor>|null=null;
function loadPostcode():Promise<PostcodeConstructor>{
 if(window.kakao?.Postcode)return Promise.resolve(window.kakao.Postcode);
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=source;script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';
  const timer=window.setTimeout(()=>fail(),12000);
  function fail(){window.clearTimeout(timer);script.remove();scriptPromise=null;reject(Error('Address search unavailable'));}
  script.onerror=fail;script.onload=()=>{window.clearTimeout(timer);if(window.kakao?.Postcode)resolve(window.kakao.Postcode);else fail()};document.head.appendChild(script);
 });return scriptPromise;
}
export function KoreanAddressSearch({onSelect,disabled=false}:{onSelect:(address:KoreanAddress)=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const host=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),generation=useRef(0),mounted=useRef(true),blocked=useRef(disabled),lock=useRef(false);
 useEffect(()=>{
  blocked.current=disabled;let active=true;
  if(disabled){generation.current++;lock.current=false;host.current?.replaceChildren();queueMicrotask(()=>{if(active&&mounted.current){setOpen(false);setLoading(false)}})}
  return()=>{active=false};
 },[disabled]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 function close(){generation.current++;lock.current=false;setOpen(false);setLoading(false);host.current?.replaceChildren();trigger.current?.focus()}
 async function search(){
  if(disabled||lock.current)return;lock.current=true;const request=++generation.current;setError('');setOpen(true);setLoading(true);
  try{const Postcode=await loadPostcode();if(!mounted.current||request!==generation.current||blocked.current)return;
   if(!host.current)throw Error('Missing search host');
   const postcode=new Postcode({width:'100%',height:'100%',autoMapping:false,oncomplete:data=>{
    if(!mounted.current||request!==generation.current||blocked.current)return;
    try{const address=parseKoreanAddress(data);close();onSelect(address)}catch{setError('검색 결과를 확인할 수 없습니다. 다시 검색하거나 직접 입력해 주세요.')}
   }});
   host.current.replaceChildren();postcode.embed(host.current,{autoClose:false});setLoading(false);
  }catch{if(mounted.current&&request===generation.current){lock.current=false;setOpen(false);setLoading(false);setError('주소 검색에 연결하지 못했습니다. 다시 시도하거나 아래 주소를 직접 입력해 주세요.')}}
 }
 return <div className="korean-address-search">
  <div className="catalog-actions"><button ref={trigger} type="button" disabled={disabled||loading||open} onClick={()=>void search()}>{loading?'주소 검색 불러오는 중…':'국내 주소 검색'}</button>{open&&<button type="button" onClick={close}>주소 검색 닫기</button>}</div>
  <p className="catalog-note">검색 시 카카오 우편번호 서비스에 연결됩니다. 검색 없이 직접 입력할 수도 있습니다.</p>
  {error&&<p role="alert" className="admin-session-error">{error}</p>}
  {loading&&<p role="status">주소 검색을 불러오고 있습니다.</p>}
  <div hidden={!open} role="region" aria-label="국내 주소 검색 영역" className="korean-address-host" ref={host}/>
 </div>
}
