'use client';
import {useId,useRef,useState} from 'react';
import {FormLabel,FormSelect} from './form-controls';
import {inventoryPageSizes,pageRange,pageButtons} from '@/lib/pagination';
import './list-pagination.css';

export function useListPagination<T>(rows: T[], resetKey: string, label: string) {
 const id=useId();const status=useRef<HTMLParagraphElement>(null);
 const [size,setSize]=useState(20);const [state,setState]=useState({key:'',page:1});
 const key=JSON.stringify([resetKey,size]);const range=pageRange(rows.length,state.key===key?state.page:1,size);
 if(state.key!==key||state.page!==range.page)setState({key,page:range.page});
 function go(page:number){setState({key,page});status.current?.focus();status.current?.scrollIntoView({block:'center'});}
 const summary=<div className="ds-list-pagination-summary"><p ref={status} tabIndex={-1} aria-live="polite">총 {range.total}건 중 {range.total?range.start+1:0}–{range.end}건 표시 · {range.pages?range.page:0} / {range.pages}페이지</p><div className="ds-form ds-list-page-size"><FormLabel htmlFor={id}>{label} 페이지당 표시</FormLabel><FormSelect id={id} value={String(size)} onChange={value=>setSize(Number(value))} options={inventoryPageSizes.map(value=>({value:String(value),label:`${value}개씩`}))}/></div></div>;
 const navigation=<nav className="ds-list-pagination" aria-label={`${label} 페이지 이동`}><button type="button" disabled={range.page<=1||!range.pages} onClick={()=>go(range.page-1)}>이전</button>{pageButtons(range.page,range.pages).map((page,index)=>page==='gap'?<span key={`gap-${index}`} aria-hidden="true">…</span>:<button type="button" key={page} aria-label={`${page}페이지`} aria-current={page===range.page?'page':undefined} onClick={()=>go(page)}>{page}</button>)}<button type="button" disabled={!range.pages||range.page>=range.pages} onClick={()=>go(range.page+1)}>다음</button></nav>;
 return {items:rows.slice(range.start,range.end),summary,navigation,range};
}
