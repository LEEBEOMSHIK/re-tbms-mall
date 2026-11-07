'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {FormLabel,FormSelect} from '@/components/ui/form-controls';
import {SaveResult} from '@/components/ui/save-result';
import {ValueStatus} from '@/components/ui/key-facts';
import {autoSlides,HeroSlideFields,sameSlides} from './hero-slides';
import {requestStorefront,type HeroSlide,type Storefront} from '@/lib/storefront';
import {MerchandisingNav} from '../merchandising-nav';
import '../merchandising.css';
import styles from './hero-editor.module.css';

const list='/admin/merchandising';
const describe=(enabled:boolean)=>enabled?'표시':'숨김';

export default function HeroEditor(){
  const [base,setBase]=useState<Storefront|null>(null);
  const [enabled,setEnabled]=useState(true);
  const [editedSlides,setEditedSlides]=useState<HeroSlide[]|null>(null);
  const [wantsAuto,setWantsAuto]=useState(false);
  const [activeId,setActiveId]=useState('');
  const savedSlides=base?(base.hero_slides??autoSlides(base)):[];
  const slides=wantsAuto&&base?autoSlides(base):editedSlides??savedSlides;
  const normalized=slides.map(s=>({...s,title:s.title.trim(),subtitle:s.subtitle.trim()}));
  const slidesChanged=editedSlides!==null&&!sameSlides(normalized,savedSlides);
  const resetAuto=wantsAuto&&base?.hero_slides!=null;
  const dirty=!!base&&(enabled!==base.hero_enabled||slidesChanged||resetAuto);
  const [confirmed,setConfirmed]=useState<Storefront|null>(null);
  const [issue,setIssue]=useState('');
  const [auth,setAuth]=useState(false);
  const [needsRead,setNeedsRead]=useState(false);
  const [busy,setBusy]=useState(true);
  const [attempt,setAttempt]=useState(0);
  const lock=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    requestStorefront({admin:true,signal:controller.signal}).then(r=>{
      if(controller.signal.aborted)return;
      if(r.ok){setBase(r.data);setEnabled(r.data.hero_enabled);}
      else{setAuth(r.reason==='auth');setIssue('상단 광고 설정을 불러오지 못했습니다.');}
      setBusy(false);
    });
    return ()=>controller.abort();
  },[attempt]);
  async function refresh(){
    if(lock.current)return;
    lock.current=true;setBusy(true);
    const r=await requestStorefront({admin:true});
    if(r.ok){
      if(!slidesChanged)setEditedSlides(null);
      if(base&&enabled===base.hero_enabled)setEnabled(r.data.hero_enabled);
      setBase(r.data);setNeedsRead(false);setAuth(false);
      setIssue('최신 진열을 확인했습니다. 작성 중인 광고와 연결 상품을 검토한 뒤 저장해 주세요.');
    }else{setAuth(r.reason==='auth');setIssue('최신 진열 조회에 실패했습니다. 선택한 값은 유지됩니다.');}
    lock.current=false;setBusy(false);
  }
  async function submit(){
    if(!base||lock.current||needsRead||!dirty)return;
    if(slidesChanged){
      const invalid=normalized.find(s=>!s.title||!base.sections.some(section=>section.id===s.section_id&&section.product_ids.includes(s.product_id))||!base.products.find(p=>p.id===s.product_id)?.image);
      if(invalid){setActiveId(invalid.id);setIssue('광고 제목, 연결 컬렉션 및 사진이 있는 소속 상품을 확인해 주세요.');requestAnimationFrame(()=>document.getElementById(!invalid.title?'ad-title':'ad-section')?.focus());return;}
    }
    lock.current=true;setBusy(true);setIssue('');
    const r=await requestStorefront({admin:true,save:{revision:base.revision,sections:base.sections,hero_enabled:enabled,...(resetAuto?{hero_slides:null}:slidesChanged?{hero_slides:normalized}:{})}});
    if(r.ok&&r.data.revision===base.revision+1&&r.data.hero_enabled===enabled&&(!resetAuto||r.data.hero_slides==null)&&(!slidesChanged||(Array.isArray(r.data.hero_slides)&&sameSlides(r.data.hero_slides,normalized)))){
      setBase(r.data);setConfirmed(r.data);
    }else{
      const reason=r.ok?'invalid-response':r.reason;
      setAuth(reason==='auth');setNeedsRead(true);
      setIssue(reason==='auth'?'로그인이 만료되었습니다. 다시 로그인한 뒤 최신 진열을 확인해 주세요.':reason==='conflict'?'다른 곳에서 홈 진열을 변경했습니다. 선택한 값은 유지됩니다. 최신 진열을 먼저 확인해 주세요.':'상단 광고 설정의 저장 결과를 확인하지 못했습니다. 선택한 값은 유지됩니다. 최신 진열을 확인해 주세요.');
    }
    lock.current=false;setBusy(false);
  }
  return <main id="main" className={`admin-page merchandising-page ${styles.workspace}`}>
    <div className={styles.heading}><div><p className="eyebrow">홈 진열 관리</p><h1>상단 광고 설정</h1></div><Link className="text-link" href="/admin/site">사이트 관리</Link></div>
    <MerchandisingNav current="hero"/>
    {confirmed?<SaveResult title="상단 광고 설정을 저장했습니다." actions={<><Link className="button" href={list}>진열 목록 확인</Link><Link className="text-link" href="/">고객 홈 확인</Link></>}>
      <p>고객 홈 상단 광고 · <ValueStatus tone={confirmed.hero_enabled?'info':'neutral'}>{describe(confirmed.hero_enabled)}</ValueStatus></p>
      <p className="small-label">확정 버전 {confirmed.revision} · {confirmed.hero_slides==null?'섹션 자동 구성':'개별 광고 '+confirmed.hero_slides.length+'개'}</p>
    </SaveResult>:base?<form className="ds-form merchandising-form" onSubmit={e=>{e.preventDefault();void submit();}}>
      <section className={styles.visibility}><div><h2>고객 홈 노출</h2>
        <p>현재 저장된 설정 · <strong>{describe(base.hero_enabled)}</strong></p></div>
        <div className={styles.visibilityField}><FormLabel htmlFor="hero-enabled">상단 광고 표시 여부</FormLabel>
          <FormSelect id="hero-enabled" value={enabled?'show':'hide'} disabled={busy} options={[{value:'show',label:'표시'},{value:'hide',label:'숨김'}]} onChange={value=>setEnabled(value==='show')}/>
        </div>
      </section>
      <fieldset disabled={busy}><legend className="sr-only">개별 광고 구성</legend><HeroSlideFields data={base} slides={slides} automatic={wantsAuto||(base.hero_slides==null&&!slidesChanged)} onChange={updated=>{setWantsAuto(false);setEditedSlides(updated);}} activeId={activeId} onSelect={setActiveId}/>{!wantsAuto&&(base.hero_slides!=null||slidesChanged)&&<div><button type="button" onClick={()=>{setEditedSlides(null);setWantsAuto(true);setActiveId('');}}>진열 섹션 자동 구성으로 전환</button><p className="small-label">저장하면 개별 광고 구성이 섹션 순서와 첫 상품 사진을 따르는 자동 구성으로 바뀝니다.</p></div>}</fieldset>
      {issue&&<div role={needsRead?'alert':'status'} className={needsRead?'merchandising-error':'admin-note'}><p>{issue}</p>
        {auth&&<Link className="text-link" href="/admin/login">다시 로그인</Link>}{needsRead&&<button type="button" disabled={busy} onClick={()=>void refresh()}>최신 진열 확인 · 선택 유지</button>}</div>}
      <div className={`${styles.saveBar} admin-save-bar`}><span role="status">{dirty?'저장하지 않은 변경사항':'저장된 설정과 일치합니다'}</span><button className="button" disabled={busy||needsRead||!dirty}>{busy?'처리 중…':'상단 광고 설정 저장'}</button></div>
    </form>:issue?<section role="alert"><p>{issue}</p>{auth&&<Link className="text-link" href="/admin/login">다시 로그인</Link>}<button onClick={()=>{setIssue('');setAuth(false);setBusy(true);setAttempt(n=>n+1);}}>다시 조회</button></section>:<p role="status">설정을 불러오고 있습니다.</p>}
  </main>;
}
