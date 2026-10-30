'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {shippingFieldError,phoneDigits,pastePhoneDigits,type Shipping} from '@/lib/customer-checkout';
import './customer-address-search.css';
import {FormLabel,FormRequiredHint} from './ui/form-controls';

type PostcodeAPI={Postcode:new(options:{oncomplete:(data:{zonecode:string;address:string})=>void;width:string;height:string})=>{embed:(element:HTMLElement)=>void}};
type AddressWindow=Window&{kakao?:PostcodeAPI;daum?:PostcodeAPI};
let scriptPromise:Promise<void>|undefined;
function loadAddress(){
 if((window as AddressWindow).kakao?.Postcode||(window as AddressWindow).daum?.Postcode)return Promise.resolve();
 if(!scriptPromise)scriptPromise=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');
  const fail=()=>{clearTimeout(timer);scriptPromise=undefined;script.remove();reject(Error())};
  const timer=setTimeout(fail,15000);
  script.src='https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
  script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=fail;document.head.appendChild(script);
 });
 return scriptPromise;
}
export function ShippingFields({value,onChange,disabled=false,showRequiredHint=true}:{value:Shipping;onChange:(value:Shipping)=>void;disabled?:boolean;showRequiredHint?:boolean}){
 const id=useId(),host=useRef<HTMLDivElement>(null),detail=useRef<HTMLInputElement>(null),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const fields=useRef<Partial<Record<keyof Shipping,HTMLInputElement>>>({}),[invalid,setInvalid]=useState<Partial<Record<keyof Shipping,boolean>>>({});
 useEffect(()=>{for(const key of Object.keys(value) as (keyof Shipping)[])fields.current[key]?.setCustomValidity(shippingFieldError(key,value[key]))},[value]);
 const request=useRef(0),selected=useRef(false),current=useRef(value),blocked=useRef(disabled);
 useEffect(()=>{current.current=value;blocked.current=disabled;if(disabled)dialog.current?.close()},[value,disabled]);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[open]);
 useEffect(()=>()=>{request.current++},[]);
 async function search(){
  if(disabled)return;
  const generation=++request.current;selected.current=false;setStatus('loading');setOpen(true);
  if(!dialog.current?.open)dialog.current?.showModal();
  host.current?.replaceChildren();
  try{
   await loadAddress();
   if(generation!==request.current||!dialog.current?.open||blocked.current)return;
   const api=(window as AddressWindow).kakao?.Postcode?(window as AddressWindow).kakao:(window as AddressWindow).daum;
   if(!api?.Postcode||!host.current)throw Error();
   new api.Postcode({width:'100%',height:'100%',oncomplete:data=>{
    if(generation!==request.current||!dialog.current?.open||blocked.current)return;
    onChange({...current.current,postal_code:data.zonecode,address:data.address});selected.current=true;dialog.current.close();
   }}).embed(host.current);setStatus('ready');
  }catch{if(generation===request.current&&dialog.current?.open)setStatus('error')}
 }
 function closed(){request.current++;setOpen(false);host.current?.replaceChildren();if(selected.current)detail.current?.focus();else trigger.current?.focus();selected.current=false}
 return <>{showRequiredHint&&<FormRequiredHint/>}<fieldset disabled={disabled} className="live-address-fields"><div className="checkout-fields">{(['recipient','phone','postal_code','address','address_detail','memo'] as const).map(key=>{
  const message=invalid[key]?shippingFieldError(key,value[key]):'';
  const input=<input id={id+key} ref={node=>{if(node)fields.current[key]=node;else delete fields.current[key];if(key==='address_detail')detail.current=node}} required={key!=='memo'} aria-invalid={message?true:undefined} aria-describedby={message?id+key+'-error':undefined} onInvalid={e=>{setInvalid(previous=>({...previous,[key]:true}));const target=e.currentTarget;if(target===target.form?.querySelector('input:invalid'))requestAnimationFrame(()=>{target.focus({preventScroll:true});target.scrollIntoView({block:'center'})})}} type={key==='phone'?'tel':'text'} inputMode={key==='phone'?'numeric':undefined} maxLength={key==='postal_code'?5:key==='recipient'?50:key==='phone'?11:key==='address_detail'?100:200} pattern={key==='postal_code'?'[0-9]{5}':undefined} value={key==='phone'?value[key].replace(/[- ]/g,''):value[key]} onPaste={key==='phone'?e=>{e.preventDefault();const target=e.currentTarget;const next=pastePhoneDigits(target.value,e.clipboardData.getData('text'),target.selectionStart??0,target.selectionEnd??target.value.length);target.setCustomValidity(shippingFieldError(key,next));onChange({...value,phone:next})}:undefined} onChange={e=>{const next=key==='phone'?phoneDigits(e.target.value):e.target.value;e.target.setCustomValidity(shippingFieldError(key,next));onChange({...value,[key]:next})}}/>;
  const feedback=message&&<span id={id+key+'-error'} className="customer-field-error">{message}</span>;
  if(key==='postal_code')return <div className="customer-postcode-field" key={key}><FormLabel htmlFor={id+key} required>우편번호</FormLabel><div className="customer-postcode-row">{input}<button ref={trigger} type="button" aria-haspopup="dialog" onClick={()=>void search()}>주소 검색</button></div>{feedback}</div>;
  return <div className={'customer-shipping-field'+(['address','address_detail','memo'].includes(key)?' checkout-wide':'')} key={key}><FormLabel htmlFor={id+key} required={key!=='memo'} hint={key==='memo'?'선택':undefined}>{{recipient:'받는 분',phone:'연락처',address:'주소',address_detail:'상세 주소',memo:'배송 요청사항'}[key]}</FormLabel>{input}{feedback}</div>;
 })}</div><p className="checkout-subtle">주소 검색 시 검색어는 카카오 우편번호 서비스로 전송됩니다.</p></fieldset>
 <dialog ref={dialog} className="customer-address-dialog" aria-labelledby={id+'search-title'} aria-describedby={id+'search-description'} onClose={closed}>
  <header className="customer-address-heading"><div><h2 id={id+'search-title'}>주소 찾기</h2><p id={id+'search-description'}>도로명이나 건물명으로 검색해 주세요.</p></div><button type="button" aria-label="주소 검색 닫기" onClick={()=>dialog.current?.close()}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button></header>
  <div className="customer-address-body">
   {status==='loading'&&<p className="customer-address-message" role="status">주소 검색을 불러오고 있어요.</p>}
   {status==='error'&&<div className="customer-address-message" role="alert"><p>주소 검색에 연결하지 못했어요.</p><p>다시 시도하거나 창을 닫고 주소를 직접 입력해 주세요.</p><button type="button" onClick={()=>void search()}>다시 시도</button></div>}
   <div className="customer-address-host" ref={host} hidden={status==='error'}/>
  </div>
  <footer className="customer-address-footer">주소를 선택하면 우편번호와 기본 주소가 입력됩니다.</footer>
 </dialog></>;
}
