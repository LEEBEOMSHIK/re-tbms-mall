'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { moveItem, requestStorefront, type Storefront, type Section, type Failure } from '@/lib/storefront';
import {KeyFacts,ValueStatus} from '@/components/ui/key-facts';
import { SaveResult } from '@/components/ui/save-result';
import { FormChoice, FormLabel, FormRequiredHint, FormSelect } from '@/components/ui/form-controls';
import './merchandising.css';
const messages:Record<Failure,string>={auth:'로그인이 만료되었습니다. 입력은 유지됩니다. 다시 로그인해 주세요.',conflict:'다른 곳에서 진열이 변경되었거나 이전 저장이 처리되었습니다. 입력은 유지됩니다. 최신 진열을 확인한 뒤 저장해 주세요.',validation:'입력을 저장할 수 없습니다. 제목과 상품 선택, 섹션 수를 확인해 주세요.',unavailable:'저장 여부를 확인하지 못했습니다. 입력은 유지됩니다. 최신 진열을 확인하기 전에는 다시 저장하지 않습니다.','invalid-response':'저장 응답을 확인하지 못했습니다. 입력은 유지됩니다. 최신 진열을 확인해 주세요.'};
type Saved={section:Section;position:number;revision:number;deleted:boolean};
const makeNew=():Section=>({id:`section-${crypto.randomUUID()}`,title:'',subtitle:'',kind:'collection',enabled:true,product_ids:[]});
const matches=(a:Section,b:Section)=>a.id===b.id&&a.title===b.title&&a.subtitle===b.subtitle&&a.kind===b.kind&&a.enabled===b.enabled&&a.product_ids.join('|')===b.product_ids.join('|');
export default function MerchandisingEditor({sectionId}:{sectionId?:string}){
  const [data,setData]=useState<Storefront|null>(null);const [draft,setDraft]=useState<Section|null>(null);const [position,setPosition]=useState(0);const [busy,setBusy]=useState(false);const [failure,setFailure]=useState<Failure|null>(null);const [error,setError]=useState('');const [saved,setSaved]=useState<Saved|null>(null);const [dirty,setDirty]=useState(false);const [notFound,setNotFound]=useState(false);const [attempt,setAttempt]=useState(0);const saving=useRef(false);
  useEffect(()=>{const controller=new AbortController();requestStorefront({admin:true,signal:controller.signal}).then(result=>{if(controller.signal.aborted)return;if(result.ok){setData(result.data);const index=sectionId?result.data.sections.findIndex(s=>s.id===sectionId):-1;if(sectionId&&index<0){setNotFound(true);return;}setDraft(sectionId?structuredClone(result.data.sections[index]):makeNew());setPosition(sectionId?index:result.data.sections.length);}else{setFailure(result.reason);setError('진열 정보를 불러오지 못했습니다. 다시 시도해 주세요.');}});return()=>controller.abort();},[sectionId,attempt]);
  function edit(patch:Partial<Section>){if(!draft)return;setDraft({...draft,...patch});setDirty(true);}
  async function inspectLatest(){
    if(saving.current)return;saving.current=true;setBusy(true);const result=await requestStorefront({admin:true});
    if(result.ok){setData(result.data);setError('최신 진열을 확인했습니다. 작성 중 입력은 유지됩니다. 저장하면 이 섹션에 현재 입력을 적용합니다.');setFailure(null);setPosition(p=>Math.min(p,result.data.sections.filter(s=>s.id!==draft?.id).length));}
    else{setFailure(result.reason);setError('최신 진열 조회에 실패했습니다. 입력은 유지되며 다시 저장하려면 조회를 완료해야 합니다.');}
    saving.current=false;setBusy(false);
  }
  async function save(deleted=false){
    if(!data||!draft||saving.current)return;
    const stored=data.sections.find(s=>s.id===draft.id);
    const clean=deleted&&stored?structuredClone(stored):{...draft,title:draft.title.trim(),subtitle:draft.subtitle.trim()};
    if(deleted&&!window.confirm(`“${clean.title}” 섹션을 삭제할까요? 저장 즉시 홈 진열에서 제외됩니다.`))return;
    if(!deleted&&!clean.title){setError('섹션 제목을 입력해 주세요.');document.getElementById('section-title')?.focus();return;}
    if(sectionId&&!data.sections.some(s=>s.id===sectionId)){setError('이 섹션이 다른 곳에서 삭제되었습니다. 입력은 유지됩니다. 목록을 확인해 주세요.');setFailure('conflict');return;}
    const sections=data.sections.filter(s=>s.id!==clean.id);const target=Math.min(position,sections.length);if(!deleted)sections.splice(target,0,clean);
    saving.current=true;setBusy(true);setError('');setFailure(null);
    const result=await requestStorefront({admin:true,save:{revision:data.revision,sections}});
    if(result.ok){const index=result.data.sections.findIndex(s=>s.id===clean.id);const confirmed=result.data.sections[index];
      if(result.data.revision!==data.revision+1||(deleted&&index>=0)||(!deleted&&(!confirmed||!matches(confirmed,clean)||index!==target))){setFailure('invalid-response');setError(messages['invalid-response']);}
      else{setData(result.data);setDirty(false);setSaved({section:deleted?clean:confirmed,position:index+1,revision:result.data.revision,deleted});}
    }else{setFailure(result.reason);setError(messages[result.reason]);}
    saving.current=false;setBusy(false);
  }
  const [productQuery,setProductQuery]=useState('');
  const query=productQuery.trim().toLocaleLowerCase();
  const candidates=data?.products.filter(product=>(product.name+' '+product.color).toLocaleLowerCase().includes(query))??[];
  const blocked=busy||failure==='auth'||failure==='conflict'||failure==='unavailable'||failure==='invalid-response';
  return <main id="main" className="admin-page merchandising-page">
    <div className="section-heading"><div><p className="eyebrow">MERCHANDISING</p><h1>{sectionId?'진열 섹션 수정':'진열 섹션 등록'}</h1></div><Link className="text-link" href="/admin/merchandising">진열 목록</Link></div>
    <p className="admin-note">섹션 제목과 공개 설정을 입력한 뒤 고객에게 보여줄 상품과 순서를 정하세요.</p>
    {saved?<SaveResult title={saved.deleted?'진열 섹션을 삭제했습니다':sectionId?'진열 섹션을 수정했습니다':'진열 섹션을 등록했습니다'} status={saved.deleted?'삭제 완료':'저장 완료'} actions={<><Link className="button" href="/admin/merchandising">진열 목록 확인</Link>{!saved.deleted&&<a className="ds-form-action" href={`/admin/merchandising/${encodeURIComponent(saved.section.id)}/edit`}>같은 섹션 다시 수정</a>}<a className="ds-form-action" href="/admin/merchandising/new">새 섹션 등록</a></>}>
      <div className="merchandising-confirmation"><h3>{saved.section.title}</h3><KeyFacts label="진열 저장 결과" items={saved.deleted?[{label:'처리 결과',value:<ValueStatus>삭제 완료</ValueStatus>,note:'홈 진열에서 제외되었습니다.'}]:[
        {label:'공개 설정',value:<ValueStatus tone={saved.section.enabled?'info':'neutral'}>{saved.section.enabled?'공개':'비공개'}</ValueStatus>,note:saved.section.product_ids.length===0?'상품이 없어 쇼핑 홈에는 표시되지 않습니다.':undefined},
        {label:'진열 순서',value:`${saved.position}번째`},
        {label:'선택 상품',value:`${saved.section.product_ids.length}개`}
      ]}/><p className="small-label">확정 버전 {saved.revision} · {saved.deleted?'해당 섹션이 홈 진열에서 제외되었습니다.':'서버에서 확인한 진열 설정입니다. 쇼핑 화면을 새로고침하면 반영됩니다.'}</p></div>
    </SaveResult>:notFound?<div role="alert"><p>수정할 진열 섹션을 찾을 수 없습니다.</p><Link className="text-link" href="/admin/merchandising">목록 확인</Link></div>:!data||!draft?<div>{error?<><p role="alert">{error}</p><button onClick={()=>{setError('');setFailure(null);setAttempt(n=>n+1);}}>다시 불러오기</button></>:<p role="status">진열 정보를 불러오고 있습니다.</p>}</div>:<>
      <form className="ds-form merchandising-form" onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy}><legend className="sr-only">진열 섹션 입력</legend>
        <section className="merchandising-panel" aria-labelledby="section-basics"><header className="merchandising-panel-heading"><h2 id="section-basics">섹션 정보</h2><FormRequiredHint/></header>
        <div className="merchandising-fields"><div className="ds-outlined-field"><FormLabel htmlFor="section-title" required>섹션 제목</FormLabel><input id="section-title" required maxLength={80} value={draft.title} onChange={e=>edit({title:e.target.value})}/></div><div className="ds-outlined-field"><FormLabel htmlFor="section-description" hint="선택">설명</FormLabel><input id="section-description" maxLength={200} value={draft.subtitle} onChange={e=>edit({subtitle:e.target.value})}/></div><div className="ds-outlined-field"><FormLabel htmlFor="section-kind">섹션 유형</FormLabel><FormSelect id="section-kind" value={draft.kind} onChange={kind=>edit({kind:kind as Section['kind']})} options={[{value:'category',label:'카테고리'},{value:'collection',label:'시즌 / 기획전'}]}/></div><div className="ds-outlined-field"><FormLabel htmlFor="section-position">진열 순서</FormLabel><FormSelect id="section-position" value={String(position)} onChange={value=>{setPosition(Number(value));setDirty(true);}} options={Array.from({length:data.sections.filter(s=>s.id!==draft.id).length+1},(_,i)=>({value:String(i),label:`${i+1}번째`}))}/></div></div>
        <div className="merchandising-visibility"><FormChoice id="section-enabled" label="쇼핑 홈에 공개" checked={draft.enabled} onChange={e=>edit({enabled:e.target.checked})}/><p>비공개로 저장하면 상품 구성을 유지한 채 홈에서 숨길 수 있습니다.</p></div></section>
        <div className="merchandising-assortment"><section className="merchandising-panel merchandising-selection" aria-labelledby="section-products"><h2 id="section-products">노출할 등록 상품 선택 <span className="merchandising-selection-count">{draft.product_ids.length}개 선택</span></h2><p>게시 중이며 공개 조건을 충족한 상품만 고객에게 표시됩니다. 준비 중인 상품도 미리 선택할 수 있습니다.</p><FormLabel htmlFor="merchandising-product-search">상품 찾기</FormLabel>
          <input id="merchandising-product-search" type="search" placeholder="상품명 또는 색상" value={productQuery} onChange={e=>setProductQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}}/>
          <p className="merchandising-match-count" role="status">검색 결과 {candidates.length}개</p>
          {!candidates.length&&<p>{query?'일치하는 상품이 없습니다. 상품명이나 색상을 바꿔 보세요.':'선택할 등록 상품이 없습니다.'}</p>}
          <div className="ds-choice-grid">{candidates.map(product=><FormChoice variant="row" key={product.id} id={`select-${product.id}`} label={product.name} caption={`${product.color} · ${product.publication_status==='published'?'게시 중':product.publication_status==='paused'?'게시 중지':'준비 중'}`} checked={draft.product_ids.includes(product.id)} onChange={e=>edit({product_ids:e.target.checked?[...draft.product_ids,product.id]:draft.product_ids.filter(id=>id!==product.id)})}/>)}</div></section>
        <section className="merchandising-panel" aria-labelledby="section-product-order"><h2 id="section-product-order">선택 상품 노출 순서</h2>{draft.product_ids.length===0?<p>상품을 선택하면 이곳에 진열 순서대로 표시됩니다.</p>:<ol className="merchandising-selected">{draft.product_ids.map((id,i)=>{const name=data.products.find(p=>p.id===id)?.name;return <li key={id}><span><b className="merchandising-item-number">{i+1}</b>{name}</span><div className="button-row"><button type="button" aria-label={`${name} 상품 위로`} disabled={i===0} onClick={()=>edit({product_ids:moveItem(draft.product_ids,i,-1)})}>↑ 위로</button><button type="button" aria-label={`${name} 상품 아래로`} disabled={i===draft.product_ids.length-1} onClick={()=>edit({product_ids:moveItem(draft.product_ids,i,1)})}>↓ 아래로</button><button type="button" aria-label={`${name} 선택 해제`} onClick={()=>edit({product_ids:draft.product_ids.filter(p=>p!==id)})}>선택 해제</button></div></li>;})}</ol>}</section></div>
        <div className="button-row merchandising-save-actions admin-save-bar"><button className="button" disabled={blocked||(!sectionId&&data.sections.length>=20&&!data.sections.some(s=>s.id===draft.id))}>{busy?'저장 중…':'진열 저장'}</button>{sectionId&&<button className="danger" type="button" disabled={blocked} onClick={()=>void save(true)}>섹션 삭제</button>}</div>{!sectionId&&data.sections.length>=20&&<p>최대 20개 섹션까지 등록할 수 있습니다.</p>}
      </fieldset></form>
      {error&&<div className="merchandising-error" role="alert"><p>{error}</p>{failure==='auth'?<Link className="text-link" href="/admin/login">다시 로그인</Link>:failure&&failure!=='validation'?<button disabled={busy} onClick={()=>void inspectLatest()}>최신 진열 확인 · 입력 유지</button>:null}</div>}{dirty&&<p className="small-label">저장하지 않은 변경이 있습니다.</p>}
    </>}
  </main>;
}

