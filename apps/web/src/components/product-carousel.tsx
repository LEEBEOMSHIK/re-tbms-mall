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

// Derive page stops from rendered cards, including a partially filled last page.
function slidePages(track: HTMLDivElement) {
  const cards = Array.from(track.children);
  const last = Math.max(0, track.scrollWidth - track.clientWidth);
  const stops = [0];
  if (cards.length < 2 || last <= 2) return stops;
  const left = cards[0].getBoundingClientRect().left;
  const stride = cards[1].getBoundingClientRect().left - left;
  const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
  const visibleCards = Math.max(1, Math.round((track.clientWidth + gap) / stride));
  for (let i = visibleCards; i < cards.length; i += visibleCards) {
    const offset = Math.min(last, cards[i].getBoundingClientRect().left - left);
    if (offset > stops[stops.length - 1] + 2) stops.push(offset);
  }
  if (last > stops[stops.length - 1] + 2) stops.push(last);
  return stops;
}

function closestPage(stops: number[], left: number) {
  return stops.reduce((best, x, i) =>
    Math.abs(x - left) < Math.abs(stops[best] - left) ? i : best, 0);
}

function advance(track: HTMLDivElement, stops: number[], direction: number, smooth: boolean) {
  const index = closestPage(stops, track.scrollLeft);
  const next = (index + direction + stops.length) % stops.length;
  track.scrollTo({left: stops[next], behavior: smooth ? 'smooth' : 'instant'});
}

export function ProductCarousel({ title, products, priority, suspended }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const drag = useRef<{x:number; left:number; page:number; moved:boolean} | null>(null);
  const blockClick = useRef(false);
  const stops = useRef([0]);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const overflow = pageCount > 1;
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  const [cardFocused, setCardFocused] = useState(false);
  const touchStart = useRef<{x:number;y:number} | null>(null);

  useEffect(() => {
    const element = track.current;
    const container = root.current;
    if (!element || !container) return;
    const syncPage = () => setPage(closestPage(stops.current, element.scrollLeft));
    const measure = () => {
      stops.current = slidePages(element);
      setPageCount(stops.current.length);
      syncPage();
    };
    element.addEventListener('scroll', syncPage, {passive:true});
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    if (element.firstElementChild) resize.observe(element.firstElementChild);
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
      element.removeEventListener('scroll', syncPage);
      resize.disconnect();
      intersection.disconnect();
      motion.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, [products.length]);

  const playing = overflow && visible && !hidden && !reducedMotion && !paused && !cardFocused && !suspended;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const element = track.current;
      if (!element) return;
      advance(element, stops.current, 1, true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [playing]);

  function move(direction: -1 | 1) {
    setPaused(true);
    const element = track.current;
    if (!element) return;
    advance(element, stops.current, direction, !reducedMotion);
  }

  function finishDrag(element: HTMLDivElement, cancelled = false) {
    const start = drag.current;
    drag.current = null;
    if (!start?.moved) return;
    delete element.dataset.dragging;
    const distance = element.scrollLeft - start.left;
    const threshold = Math.min(72, element.clientWidth * 0.12);
    const step = !cancelled && Math.abs(distance) >= threshold ? Math.sign(distance) : 0;
    const target = Math.max(0, Math.min(stops.current.length - 1, start.page + step));
    element.scrollTo({left:stops.current[target], behavior:reducedMotion?'instant':'smooth'});
    blockClick.current = true;
  }

  return <div ref={root} className="product-carousel" role="region" aria-label={`${title} 상품 슬라이드`} aria-roledescription="캐러셀"
    onFocusCapture={event => setCardFocused(event.target instanceof Element && !!event.target.closest('.product-card'))}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setCardFocused(false); }}>
    {overflow && <div className="carousel-controls">
      <span className="carousel-position" aria-label={`총 ${pageCount}묶음 중 ${page+1}번째`}>
        <strong>{String(page+1).padStart(2,'0')}</strong><span aria-hidden="true">/</span>{String(pageCount).padStart(2,'0')}
      </span>
      {!reducedMotion && <button type="button" aria-controls={trackId} aria-label={`${title} 자동 넘김 ${paused ? '재생' : '일시정지'}`} onClick={() => setPaused(value => !value)}>
        <svg viewBox="0 0 20 20" aria-hidden="true">{paused ? <path fill="currentColor" d="M6 3.5 16 10 6 16.5Z"/> : <path stroke="currentColor" strokeWidth="2" d="M7 4v12m6-12v12"/>}</svg>
      </button>}
      {([-1, 1] as const).map(direction=><button key={direction} type="button" aria-controls={trackId} aria-label={`${title} ${direction===1?'다음':'이전'} 상품`} onClick={()=>move(direction)}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d={direction===1?'M7 4l6 6-6 6':'M13 4l-6 6 6 6'} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>)}
    </div>}
    <div id={trackId} ref={track} className="product-grid carousel-track" aria-live="off" onTouchStart={event=>{
        const point=event.touches[0];
        touchStart.current=point ? {x:point.clientX,y:point.clientY} : null;
      }}
      onTouchMove={event=>{
        const start=touchStart.current, point=event.touches[0];
        if (!start || !point) return;
        const dx=Math.abs(point.clientX-start.x), dy=Math.abs(point.clientY-start.y);
        if (Math.max(dx,dy)<8) return;
        if (dx>dy) setPaused(true);
        touchStart.current=null;
      }}
      onTouchEnd={()=>{touchStart.current=null;}}
      onTouchCancel={()=>{touchStart.current=null;}}
      onWheel={event=>{
        if (Math.abs(event.deltaX)>Math.abs(event.deltaY) || (event.shiftKey && event.deltaY!==0)) setPaused(true);
      }}
      onDragStart={event=>{if (overflow) event.preventDefault();}}
      onPointerDown={event=>{
        blockClick.current = false;
        if (!overflow || event.pointerType!=='mouse' || event.button!==0) return;
        const left=event.currentTarget.scrollLeft;
        drag.current={x:event.clientX,left,page:closestPage(stops.current,left),moved:false};
      }}
      onPointerMove={event=>{
        const start=drag.current;
        if (!start || event.pointerType!=='mouse') return;
        if (!(event.buttons & 1)) { finishDrag(event.currentTarget,true); return; }
        const dx=event.clientX-start.x;
        if (!start.moved && Math.abs(dx)<8) return;
        if (!start.moved) {
          start.moved=true;
          event.currentTarget.dataset.dragging='true';
          event.currentTarget.setPointerCapture(event.pointerId);
          setPaused(true);
        }
        event.currentTarget.scrollLeft=start.left-dx;
      }}
      onPointerUp={event=>finishDrag(event.currentTarget)}
      onPointerCancel={event=>finishDrag(event.currentTarget,true)}
      onClickCapture={event=>{
        if (blockClick.current && event.detail>0) {
          event.preventDefault();event.stopPropagation();blockClick.current=false;
        }
      }}>
      {products.map((product, index) => <Link href={`/products/${encodeURIComponent(product.id)}`} className="product-card" key={product.id} onClick={() => setPaused(true)} aria-label={`${product.name}, ${priceDescription(product)}, 자세히 보기`}>
        <div className="product-image"><Image src={shopImage(product.image)} unoptimized alt={`${product.color} ${product.name}`} width={480} height={640} priority={priority && index < 4}/>{product.sold_out&&<span className="shop-soldout">품절</span>}<span className="view-label">자세히 보기 ↗</span></div>
        <div className="product-info"><h3>{product.name}</h3><ShopPrice pricing={product}/><ProductOptionPreview options={product.options}/><ReviewRating summary={product.review_summary}/></div>
      </Link>)}
    </div>
  </div>;
}
