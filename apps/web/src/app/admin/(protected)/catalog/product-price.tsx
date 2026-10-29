 'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {catalogRequest} from '@/lib/catalog';
import {parsePublication,publicationLabels,type Publication} from '@/lib/publication';
import {useListPagination} from '@/components/ui/list-pagination';
import {ShopPrice} from '@/components/shop-price';
import './catalog.css';
const amount=(price:number|null)=>price===null?'미입력':`${price.toLocaleString('ko-KR')}원`;
export function ProductPrice({id,history=false}:{id:string;history?:boolean}){
 const [data,setData]=useState<Publication|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;void catalogRequest(`/api/admin/products/${encodeURIComponent(id)}/publication`,parsePublication).then(r=>{if(!active)return;if(r.ok&&r.data.product_id===id){setData(r.data);setError('')}else setError('가격 정보를 불러오지 못했습니다.')});return()=>{active=false}},[id,attempt]);
 const pages=useListPagination(data?.history||[],id,'가격·공개 설정 이력');
 const content=<section className="catalog-panel product-price-panel"><div className="catalog-heading"><div><h2>{history?data?.product_name||'상품 가격':'판매 가격'}</h2>{data&&<>{data.effective_price===null?<strong className="product-price-amount">미입력</strong>:<ShopPrice pricing={data}/>}</>}</div><div className="catalog-actions"><Link className="catalog-link-button" href={`/admin/catalog/${id}/publication/edit`}>가격·공개 설정 수정</Link>{!history&&<Link className="catalog-link-button" href={`/admin/catalog/${id}/price`}>가격 이력</Link>}<Link className="catalog-link-button" href={`/admin/reviews?product_id=${encodeURIComponent(id)}`}>리뷰 관리</Link></div></div>{error?<div role="alert"><p>{error}</p><button onClick={()=>setAttempt(v=>v+1)}>다시 조회</button></div>:!data?<p role="status">가격 조회 중…</p>:<>{data.price===null&&<p className="catalog-note">가격을 입력하면 고객 화면에 표시됩니다.</p>}{history&&<><p className="catalog-note">가격과 공개 상태를 함께 저장한 이력입니다.</p>{pages.summary}{data.history.length===0?<p>저장 이력이 없습니다.</p>:<div className="catalog-table-scroll"><table className="catalog-table"><thead><tr><th>변경 시각</th><th>기본 판매 가격</th><th>할인 판매 가격</th><th>최종 판매 가격</th><th>공개 상태</th></tr></thead><tbody>{pages.items.map((h,i)=><tr key={`${h.created_at}-${i}`}><td>{new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(h.created_at))}</td><td>{amount(h.price)}</td><td>{h.discount_price===null?'적용 안 함':amount(h.discount_price)}</td><td><strong>{amount(h.effective_price)}</strong>{h.discount_rate!==null&&h.discount_rate>0&&<small>{h.discount_rate}% 할인</small>}</td><td>{publicationLabels[h.status]}</td></tr>)}</tbody></table></div>}{pages.navigation}</>}</>}</section>;
 return history?<main id="main" className="catalog-page"><header className="catalog-heading"><h1>가격·공개 설정 이력</h1><Link className="catalog-link-button" href={`/admin/catalog/${id}`}>상품 상세</Link></header>{content}</main>:content;
}
