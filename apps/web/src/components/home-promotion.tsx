'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {shopImage, type HeroSlide, type Product, type Section} from '@/lib/storefront';
import styles from './home-promotion.module.css';

type Promotion = Pick<Section, 'id' | 'title' | 'subtitle'> & {products: Product[]};

function Chevron({back = false}: {back?: boolean}) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={back ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}/></svg>;
}

function resolveSlides(sections: Promotion[], configured: HeroSlide[] | null) {
  if (configured == null) {
    return sections.filter(section => section.products[0]?.image).map(section => ({
      id: section.id, sectionId: section.id, title: section.title, subtitle: section.subtitle, product: section.products[0],
    }));
  }
  return configured.flatMap(slide => {
    const section = sections.find(item => item.id === slide.section_id);
    const product = section?.products.find(item => item.id === slide.product_id);
    return slide.enabled && product?.image ? [{
      id: slide.id, sectionId: slide.section_id, title: slide.title, subtitle: slide.subtitle, product,
    }] : [];
  });
}

export function HomePromotion({sections, configured}: {sections: Promotion[]; configured: HeroSlide[] | null}) {
  const slides = resolveSlides(sections, configured);
  const count = slides.length;
  const [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [visible, setVisible] = useState(false);
  const frame = useRef<HTMLElement>(null);
  const touch = useRef<{x: number; y: number} | null>(null);
  const suppressClick = useRef(false);
  const index = count ? position % count : 0;
  const slide = slides[index];

  useEffect(() => {
    if (!frame.current) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let intersecting = false;
    const sync = () => {
      setMotionAllowed(!motion.matches);
      setVisible(intersecting && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; sync(); });
    observer.observe(frame.current);
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused || hovered || !visible || !motionAllowed) return;
    const timer = window.setInterval(() => setPosition(n => (n + 1) % count), 6000);
    return () => window.clearInterval(timer);
  }, [count, paused, hovered, visible, motionAllowed]);

  if (!slide) return null;
  const move = (step: number) => {
    setPaused(true);
    setPosition((index + step + count) % count);
  };
  return <section ref={frame} className={`home-promotion ${styles.hero}`} aria-label="홈 광고" aria-roledescription="캐러셀"
    onPointerDownCapture={() => { suppressClick.current = false; }}
    onClickCapture={event => {
      if (suppressClick.current && event.detail > 0) {
        event.preventDefault();
        event.stopPropagation();
      }
      suppressClick.current = false;
    }}
    onTouchStart={event => {
      if ((event.target as Element).closest('button') || event.touches.length !== 1) { touch.current = null; return; }
      const point = event.touches[0];
      touch.current = {x: point.clientX, y: point.clientY};
    }}
    onTouchCancel={() => {touch.current = null;}}
    onTouchEnd={event => {
      const start = touch.current, end = event.changedTouches[0];
      touch.current = null;
      if (!start || !end) return;
      const dx = end.clientX - start.x, dy = end.clientY - start.y;
      suppressClick.current = Math.max(Math.abs(dx), Math.abs(dy)) > 12;
      if (count > 1 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
    }}
    onFocusCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(true); }}
    onPointerEnter={event => setHovered(event.pointerType === 'mouse')} onPointerLeave={() => setHovered(false)}>
    <div className={styles.copy}>
      <p className={styles.label}><i aria-hidden="true"/> RE:TAG COLLECTION</p>
      <h2>{slide.title}</h2>
      {slide.subtitle && <p className={styles.caption}>{slide.subtitle}</p>}
      <Link className={styles.link} aria-label={`${slide.title} 컬렉션 보기`} href={`/products?collection=${encodeURIComponent(slide.sectionId)}`}>컬렉션 보기 <Chevron/></Link>
      {count > 1 && <div className={styles.controls}>
        <span className={styles.counter} aria-label={`전체 ${count}개 중 ${index + 1}번째`}><b>{String(index + 1).padStart(2,'0')}</b> / {String(count).padStart(2,'0')}</span>
        <button type="button" aria-label="이전 광고" onClick={() => move(-1)}><Chevron back/></button>
        <button type="button" aria-label="다음 광고" onClick={() => move(1)}><Chevron/></button>
        {motionAllowed && <button type="button" aria-label={paused ? '광고 자동 재생' : '광고 일시정지'} onPointerDown={event => event.preventDefault()} onClick={() => setPaused(p => !p)}>
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="currentColor">{paused ? <path d="M5 3l11 7-11 7z"/> : <path d="M5 3h3v14H5zm7 0h3v14h-3z"/>}</svg>
        </button>}
      </div>}
    </div>
    <div className={styles.visual}>
      <Image key={slide.id} src={shopImage(slide.product.image)} alt={slide.product.name} width={840} height={560} priority unoptimized/>
    </div>
  </section>;
}
