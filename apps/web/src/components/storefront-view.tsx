'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {requestStorefront, visibleSections, type Storefront} from '@/lib/storefront';
import {ProductCarousel} from './product-carousel';
import {HomePromotion} from './home-promotion';
import './shop.css';
import styles from './storefront-view.module.css';

function Arrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;
}

type Collection = ReturnType<typeof visibleSections>[number];

function CollectionSection({section, index}: {section: Collection; index: number}) {
  const collectionHref = section.id === 'all' ? '/products' : `/products?collection=${encodeURIComponent(section.id)}`;
  return <section className="product-section" aria-label={section.title}>
    <div className="section-heading"><div><h2>{section.title}</h2>{section.subtitle && <p className="section-subtitle">{section.subtitle}</p>}</div>
      <Link className={styles.more} href={collectionHref}>모두 보기 <Arrow/></Link>
    </div>
    <ProductCarousel title={section.title} products={section.products} priority={index === 0} suspended={false}/>
  </section>;
}

export function StorefrontView() {
  const [data, setData] = useState<Storefront | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void requestStorefront({signal: controller.signal}).then(result => {
      if (controller.signal.aborted) return;
      if (result.ok) setData(result.data);
      else setError(true);
    });
    return () => controller.abort();
  }, [attempt]);
  const sections = data ? visibleSections(data, 'all') : [];
  return <div className="shop-home">
    {data?.hero_enabled && <HomePromotion sections={sections} configured={data.hero_slides}/>}
    <header className="shop-intro"><div><p className="eyebrow">THE EVERYDAY EDIT</p><h1>오늘의 옷장</h1></div>
      <Link className={styles.more} href="/products">전체 상품 보기 <Arrow/></Link>
    </header>
    {data && <nav className={styles.categories} aria-label="상품 카테고리">{data.categories.filter(c => !c.parent_id).map(c =>
      <Link key={c.id} href={`/products?category=${encodeURIComponent(c.id)}`}>{c.name}</Link>
    )}</nav>}
    {error ? <div className="empty-state" role="alert"><h2>상품을 불러오지 못했어요.</h2><button onClick={() => {setError(false); setAttempt(v => v + 1);}}>다시 보기</button></div>
      : !data ? <p className="empty-state" role="status">상품을 불러오고 있어요.</p>
      : sections.length === 0 ? <div className="empty-state"><h2>새로운 옷을 준비하고 있어요.</h2><p>전체 상품에서 다양한 옷을 만나보세요.</p></div>
      : sections.map((section, index) => <CollectionSection key={section.id} section={section} index={index}/>)}
  </div>;
}
