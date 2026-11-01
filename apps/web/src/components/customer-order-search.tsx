'use client';
import {useState} from 'react';
import {FormSelect} from './ui/form-controls';
import {customerOrderStates,customerOrderFilter} from '@/lib/customer-order-filter';
export function CustomerOrderSearch({loading,onSearch}:{loading:boolean;onSearch:(q:Record<string,string>)=>void}){
 const [state,setState]=useState(''),[period,setPeriod]=useState(''),[query,setQuery]=useState(''),[applied,setApplied]=useState('||');
 return <form className="customer-order-search ds-form" aria-label="내 주문 필터" onSubmit={e=>{e.preventDefault();onSearch({...customerOrderFilter(state,period),q:query.trim()});setQuery(query.trim());setApplied(state+'|'+period+'|'+query.trim())}}>
  <div className="customer-order-filter-fields"><div><label htmlFor="customer-order-state">진행 상태</label><FormSelect id="customer-order-state" value={state} onChange={setState} options={customerOrderStates}/></div>
  <div><label htmlFor="customer-order-period">조회 기간</label><FormSelect id="customer-order-period" value={period} onChange={setPeriod} options={[{value:'',label:'전체 기간'},{value:'1',label:'최근 1개월'},{value:'3',label:'최근 3개월'},{value:'6',label:'최근 6개월'},{value:'12',label:'최근 1년'}]}/></div>
  <div className="customer-order-query"><label htmlFor="customer-order-query">상품명</label><input id="customer-order-query" type="search" value={query} maxLength={100} placeholder="주문한 상품명 검색" onChange={e=>setQuery(e.target.value)}/></div>
  <div className="customer-order-filter-actions"><button type="button" className="sales-action" disabled={loading} onClick={()=>{setState('');setPeriod('');setQuery('');setApplied('||');onSearch({})}}>초기화</button><button type="submit" className="sales-action customer-order-apply" disabled={loading}>{loading?'조회 중…':'조회'}</button></div></div>
  <p className="sales-muted" role="status">{applied!==state+'|'+period+'|'+query?'조건을 변경했어요. 조회를 눌러 적용해 주세요.':'주문한 날짜 기준으로 조회합니다.'}</p>
 </form>;
}
