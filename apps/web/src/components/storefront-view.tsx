'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ProductCarousel} from './product-carousel';
import {requestStorefront,visibleSections,type Storefront} from '@/lib/storefront';
import './shop.css';
export function StorefrontView(){
 const [data,setData]=useState<Storefront|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const c=new AbortController();void requestStorefront({signal:c.signal}).then(r=>{if(c.signal.aborted)return;if(r.ok)setData(r.data);else setError(true)});return()=>c.abort()},[attempt]);
 const sections=data?visibleSections(data,'all'):[];
 return <div className="shop-home"><div className="shop-intro"><div><p className="eyebrow">THE EVERYDAY EDIT</p><h1>오늘의 옷장</h1></div><Link className="shop-action" href="/products">전체 상품 보기 →</Link></div><nav className="category-nav" aria-label="상품 카테고리">{data?.categories.filter(c=>!c.parent_id).map(c=><Link key={c.id} className="shop-category-link" href={`/products?category=${encodeURIComponent(c.id)}`}>{c.name}</Link>)}</nav>
 {error?<div className="empty-state" role="alert"><h2>상품을 불러오지 못했어요.</h2><button onClick={()=>{setError(false);setAttempt(v=>v+1)}}>다시 보기</button></div>:!data?<p className="empty-state" role="status">상품을 불러오고 있어요.</p>:sections.length===0?<div className="empty-state"><h2>새로운 옷을 준비하고 있어요.</h2><p>전체 상품에서 다양한 옷을 만나보세요.</p></div>:<>{sections.map((s,index)=><section className="product-section" key={s.id}><div className="section-heading"><div><h2>{s.title}</h2>{s.subtitle&&<p className="section-subtitle">{s.subtitle}</p>}</div><Link className="shop-action" href={s.id==='all'?'/products':`/products?collection=${encodeURIComponent(s.id)}`}>모두 보기 →</Link></div><ProductCarousel title={s.title} products={s.products} priority={index===0} suspended={false}/></section>)}</>}
 </div>;
}
