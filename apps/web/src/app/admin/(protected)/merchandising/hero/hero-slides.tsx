'use client';
import Image from 'next/image';
import Link from 'next/link';
import styles from './hero-editor.module.css';
import {useEffect,useRef} from 'react';
import {FormLabel,FormSelect} from '@/components/ui/form-controls';
import {moveItem,shopImage,type HeroSlide,type Storefront} from '@/lib/storefront';

export function autoSlides(data:Storefront):HeroSlide[]{
  return data.sections.filter(section=>section.enabled).flatMap(section=>{
    const first=section.product_ids.map(id=>data.products.find(product=>product.id===id))
      .find(product=>product&&(!product.publication_status||product.publication_status==='published'));
    return first?.image?[{id:section.id,section_id:section.id,product_id:first.id,title:section.title,subtitle:section.subtitle,enabled:true}]:[];
  });
}
export function sameSlides(left:HeroSlide[],right:HeroSlide[]){
  return left.length===right.length&&left.every((s,i)=>{
    const other=right[i];
    return s.id===other.id&&s.title===other.title&&s.subtitle===other.subtitle&&s.product_id===other.product_id&&s.section_id===other.section_id&&s.enabled===other.enabled;
  });
}

export function HeroSlideFields({data,slides,automatic,onChange,activeId,onSelect}:{data:Storefront;slides:HeroSlide[];automatic:boolean;onChange:(slides:HeroSlide[])=>void;activeId:string;onSelect:(id:string)=>void}){
  const slide=slides.find(item=>item.id===activeId)??slides[0];
  const index=slides.indexOf(slide);
  const focusTitle=useRef(false);
  const title=useRef<HTMLInputElement>(null);
  const addButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(focusTitle.current){focusTitle.current=false;if(title.current)title.current.focus();else addButton.current?.focus();}},[slide?.id]);
  const choices=data.sections.map(section=>({section,products:section.product_ids.flatMap(id=>data.products.filter(p=>p.id===id&&p.image))})).filter(choice=>choice.products.length);
  const selected=choices.find(choice=>choice.section.id===slide?.section_id);
  const picture=selected?.products.find(p=>p.id===slide.product_id);
  function update(patch:Partial<HeroSlide>){onChange(slides.map(s=>s.id===slide.id?{...s,...patch}:s));}
  function add(){
    const first=choices[0];if(!first)return;
    const id=crypto.randomUUID();
    onChange([...slides,{id,section_id:first.section.id,product_id:first.products[0].id,title:first.section.title,subtitle:first.section.subtitle,enabled:true}]);onSelect(id);focusTitle.current=true;
  }
  return <section aria-labelledby="ad-collection-title">
    <div className={styles.workbench}>
      <div className={styles.rail}><div className={styles.railHeading}><h2 id="ad-collection-title">광고 슬라이드</h2><span>{slides.length}</span></div>
        <p className={styles.mode}>{automatic?'섹션 자동 구성':'개별 구성'}</p>
        <ol aria-label="광고 순서">{slides.map((s,i)=><li key={s.id}><button type="button" aria-pressed={slide.id===s.id} onClick={()=>onSelect(s.id)}><span className={styles.ordinal}>{String(i+1).padStart(2,'0')}</span><span><strong>{s.title||'제목 없음'}</strong><small>{s.enabled?'표시':'숨김'}</small></span></button></li>)}</ol>
        <button ref={addButton} type="button" disabled={!choices.length||slides.length>=20} onClick={add}>광고 추가</button>
        {!choices.length&&<p className="small-label">상품 사진을 사용하려면 먼저 진열 섹션에 사진이 있는 상품을 추가해 주세요.</p>}
      </div>
      {slide?<div className={`merchandising-ad-editor ${styles.editor}`}>
        <div className={styles.preview} aria-label="편집 중인 광고 미리보기"><div>
          <small>광고 미리보기 · {String(index+1).padStart(2,'0')}</small>
          <h3>{slide.title||'광고 제목'}</h3>{slide.subtitle&&<p>{slide.subtitle}</p>}
        </div>{picture&&(!picture.publication_status||picture.publication_status==='published')?<Image unoptimized src={shopImage(picture.image)} width={320} height={200} alt={picture.name}/>:<span>공개 사진 없음</span>}</div>
        <div className={styles.fieldHeading}><h3>광고 내용</h3><label className="checkbox-label"><input type="checkbox" checked={slide.enabled} onChange={e=>update({enabled:e.target.checked})}/>이 광고 표시</label></div>
        <div className="merchandising-fields"><div><FormLabel htmlFor="ad-title" required>광고 제목</FormLabel><input ref={title} id="ad-title" value={slide.title} maxLength={80} onChange={e=>update({title:e.target.value})}/></div>
          <div><FormLabel htmlFor="ad-subtitle">부제</FormLabel><input id="ad-subtitle" value={slide.subtitle} maxLength={200} onChange={e=>update({subtitle:e.target.value})}/></div>
          <div><FormLabel htmlFor="ad-section">연결 컬렉션</FormLabel><FormSelect id="ad-section" value={selected?.section.id??''} options={choices.map(c=>({value:c.section.id,label:c.section.title+(c.section.enabled?'':' · 비공개')}))} onChange={id=>{const c=choices.find(choice=>choice.section.id===id);if(c&&id!==slide.section_id)update({section_id:id,product_id:c.products[0].id});}}/></div>
          <div><FormLabel htmlFor="ad-product">이미지로 사용할 상품</FormLabel><FormSelect id="ad-product" value={picture?.id??''} options={(selected?.products??[]).map(p=>({value:p.id,label:p.name}))} onChange={id=>update({product_id:id})}/></div>
        </div>
        {selected&&<div className={styles.destination}><small>배너 클릭 시</small>{selected.section.enabled&&selected.products.some(p=>!p.publication_status||p.publication_status==='published')
          ?<Link href={`/products?collection=${encodeURIComponent(selected.section.id)}`} target="_blank" rel="noopener noreferrer">{selected.section.title} 열기 ↗<span className="sr-only"> (새 탭)</span></Link>
          :<span>{selected.section.title} · 공개 전</span>}</div>}
        <div className="button-row"><button type="button" disabled={index===0} onClick={()=>{onSelect(slide.id);onChange(moveItem(slides,index,-1));}}>위로</button><button type="button" disabled={index===slides.length-1} onClick={()=>{onSelect(slide.id);onChange(moveItem(slides,index,1));}}>아래로</button><button type="button" onClick={()=>{const next=slides.filter(s=>s.id!==slide.id);onChange(next);onSelect(next[Math.min(index,next.length-1)]?.id??'');focusTitle.current=true;}}>광고 삭제</button></div>
      </div>:<p>등록된 광고가 없습니다. 광고를 추가하면 고객 홈에 표시할 구성을 작성할 수 있습니다.</p>}
    </div></section>;
}
