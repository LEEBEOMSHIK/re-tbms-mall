'use client';
import {ProductOptionPreview} from './product-option-preview';

import Image from 'next/image';
import {priceDescription} from '@/lib/pricing';
import {ShopPrice} from './shop-price';
import {ReviewRating} from './review-rating';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { shopImage, type Product } from '../lib/storefront';
import './carousel.css';

type Props = {
  title: string;
  products: Product[];
  priority: boolean;
  suspended: boolean;
  onSelect?: (product: Product) => void;
};

export function ProductCarousel({ title, products, priority, suspended }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const [overflow, setOverflow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const element = track.current;
    const container = root.current;
    if (!element || !container) return;
    const measure = () => setOverflow(element.scrollWidth > element.clientWidth + 2);
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    const intersection = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    intersection.observe(container);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateVisibility = () => setHidden(document.hidden);
    // These callbacks synchronize browser-owned state, including the initial observation.
    updateMotion();
    updateVisibility();
    measure();
    motion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      resize.disconnect();
      intersection.disconnect();
      motion.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, [products.length]);

  const playing = overflow && visible && !hidden && !reducedMotion && !paused && !hovered && !focused && !suspended;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const element = track.current;
      if (!element) return;
      const end = element.scrollWidth - element.clientWidth;
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
      element.scrollTo({ left: element.scrollLeft >= end - 2 ? 0 : Math.min(end, element.scrollLeft + element.clientWidth + gap), behavior: 'smooth' });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [playing]);

  function move(direction: -1 | 1) {
    setPaused(true);
    const element = track.current;
    if (!element) return;
    const end = element.scrollWidth - element.clientWidth;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    let next = element.scrollLeft + direction * (element.clientWidth + gap);
    if (direction === 1 && element.scrollLeft >= end - 2) next = 0;
    if (direction === -1 && element.scrollLeft <= 2) next = end;
    element.scrollTo({ left: Math.max(0, Math.min(end, next)), behavior: reducedMotion ? 'instant' : 'smooth' });
  }

  return <div ref={root} className="product-carousel" role="region" aria-label={`${title} 상품 슬라이드`} aria-roledescription="캐러셀"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    {overflow && <div className="carousel-controls">
      <span className="carousel-state">{reducedMotion ? '수동 넘김' : playing ? '5초마다 자동 넘김' : '자동 넘김 멈춤'}</span>
      {!reducedMotion && <button type="button" aria-controls={trackId} aria-label={`${title} 자동 넘김 ${paused ? '재생' : '일시정지'}`} onClick={() => setPaused(value => !value)}>{paused ? '재생' : '일시정지'}</button>}
      <button type="button" aria-controls={trackId} aria-label={`${title} 이전 상품`} onClick={() => move(-1)}>←<span className="sr-only"> 이전</span></button>
      <button type="button" aria-controls={trackId} aria-label={`${title} 다음 상품`} onClick={() => move(1)}><span className="sr-only">다음 </span>→</button>
    </div>}
    <div id={trackId} ref={track} className="product-grid carousel-track" aria-live="off" onTouchStart={() => setPaused(true)} onWheel={() => setPaused(true)}>
      {products.map((product, index) => <Link href={`/products/${encodeURIComponent(product.id)}`} className="product-card" key={product.id} onClick={() => setPaused(true)} aria-label={`${product.name}, ${priceDescription(product)}, 자세히 보기`}>
        <div className="product-image"><Image src={shopImage(product.image)} unoptimized alt={`${product.color} ${product.name}`} width={480} height={640} priority={priority && index < 4}/>{product.sold_out&&<span className="shop-soldout">품절</span>}<span className="view-label">자세히 보기 ↗</span></div>
        <div className="product-info"><h3>{product.name}</h3><ShopPrice pricing={product}/><ProductOptionPreview options={product.options}/><ReviewRating summary={product.review_summary}/></div>
      </Link>)}
    </div>
  </div>;
}
