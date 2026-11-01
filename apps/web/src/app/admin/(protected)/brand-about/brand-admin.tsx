'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { adminAuthFetch } from '@/lib/admin-auth-fetch';
import { BRAND_PRESETS, brandImageUrl, parseBrandContent, parseBrandState, parseBrandUpload, type BrandContent, type BrandState } from '@/lib/brand-about';
import { BrandAboutView } from '@/components/brand-about-view';
import { SaveResult } from '@/components/ui/save-result';
import { FormLabel, FormRequiredHint, FormSelect } from '@/components/ui/form-controls';
import './brand-admin.css';
const ROOT = '/admin/brand-about';
async function request<T>(path: string, parse: (v: unknown) => T, body?: unknown, method = 'POST'): Promise<T> {
  const response = await adminAuthFetch(`/api/admin/brand-about${path}`, {cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(20000),...(body === undefined ? {} : {method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  if (!response.ok) throw Error(response.status === 409 ? 'conflict' : response.status === 401 ? 'auth' : [413,422].includes(response.status) ? 'invalid' : 'unknown');
  return parse(await response.json());
}
function failure(error: unknown) { return error instanceof Error && error.message === 'conflict' ? '다른 관리자가 변경했습니다. 입력은 유지됩니다. 최신 상태를 확인한 뒤 다시 저장해 주세요.' : error instanceof Error && error.message === 'auth' ? '관리자 로그인이 만료되었습니다.' : error instanceof Error && error.message === 'invalid' ? '입력 또는 이미지 형식을 확인해 주세요. 입력은 유지됩니다.' : '처리 결과를 확인하지 못했습니다. 입력은 유지됩니다. 중복 처리 전에 최신 상태를 확인해 주세요.'; }
export function BrandAdmin({ mode }: { mode: 'status' | 'edit' | 'preview' }) {
  const [state,setState] = useState<BrandState|null>(null);
  const [content,setContent] = useState<BrandContent|null>(null);
  const [latest,setLatest] = useState<BrandState|null>(null);
  const [busy,setBusy] = useState(false);
  const lock = useRef(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [blocked,setBlocked] = useState(false);
  const [result,setResult] = useState<{state:BrandState;publish:boolean}|null>(null);
  const [localPreview,setLocalPreview] = useState(false);
  const load = useCallback(async () => {
    if (lock.current) return; lock.current=true;setBusy(true);setError('');
    try { const next = await request('',parseBrandState); setState(next);setContent(next.draft);setBlocked(false); } catch(error) { setError(failure(error)); } finally { lock.current=false;setBusy(false); }
  }, []);
  useEffect(() => {
    let active = true;
    lock.current = true;
    request('',parseBrandState).then(next => { if(active){setState(next);setContent(next.draft);} }).catch(error => {if(active)setError(failure(error));}).finally(()=>{if(active){lock.current=false;setBusy(false);}});
    return () => { active=false;lock.current=false; };
  },[]);
  const recover = async () => {
    if (lock.current) return; lock.current=true;setBusy(true);setError('');
    try { const next=await request('',parseBrandState); if(mode==='edit')setLatest(next);else{setState(next);setBlocked(false);setNotice('최신 저장 상태를 확인했습니다. 게시할 제목과 버전을 확인해 주세요.');} }catch(error){setError(failure(error));}finally{lock.current=false;setBusy(false);}
  };
  const mutate = async (publish: boolean) => {
    if (!state || !content || lock.current || blocked) return;
    let validated: BrandContent; try {validated=parseBrandContent(content);}catch{setError('필수 내용과 이미지 설명을 확인해 주세요. 공백만 입력할 수 없습니다.');return;}
    lock.current=true;setBusy(true);setError('');setResult(null);setNotice('');
    try { const next = await request(publish?'/publish':'',parseBrandState,publish?{revision:state.revision}:{revision:state.revision,content:validated},publish?'POST':'PUT'); setState(next);setContent(next.draft);setResult({state:next,publish}); }
    catch(error){setError(failure(error));if(!(error instanceof Error && error.message==='invalid'))setBlocked(true);}
    finally{lock.current=false;setBusy(false);}
  };
  const change = (next: BrandContent) => {setContent(next);setResult(null);setNotice('');};
  const upload = async (file: File|undefined, target: { kind: 'hero' } | { kind: 'topic'; id: string }) => {
    if(!file||!content||lock.current)return;
    if(file.size>2*1024*1024 || !['image/png','image/jpeg','image/webp'].includes(file.type)){setError('PNG·JPEG·WebP 이미지 2 MiB 이하만 선택해 주세요.');return;}
    lock.current=true;setBusy(true);setError('');setResult(null);
    try { const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192)); const image=(await request('/assets',parseBrandUpload,{filename:file.name,content_base64:btoa(binary)})).image; setContent(current=>current && (target.kind==='hero'?{...current,hero_image:image}:{...current,topics:current.topics.map(t=>t.id===target.id?{...t,image}:t)}));setNotice('이미지를 업로드해 입력에 반영했습니다. 아직 소개글은 저장되지 않았습니다. 초안을 저장해 주세요.'); }
    catch(error){setError(failure(error));}finally{lock.current=false;setBusy(false);}
  };
  return <main id="main" className="admin-page brand-admin">
    <header className="brand-admin-heading"><div><p className="eyebrow">BRAND STORY</p><h1>{mode==='edit'?'브랜드 소개 편집':mode==='preview'?'저장된 초안 미리보기':'브랜드 소개 관리'}</h1><p className="admin-note">{mode==='edit'?'초안 저장 후 미리보기를 확인하고 관리 화면에서 게시하세요.':mode==='preview'?'이 화면은 저장된 초안입니다. 고객 화면에는 게시된 내용만 표시됩니다.':'초안과 고객에게 게시된 소개를 각각 관리합니다.'}</p></div><Link className="text-link" href={mode==='status'?'/admin/site':ROOT}>{mode==='status'?'사이트 관리':'브랜드 소개 관리'}</Link></header>
    {error&&<div className="brand-admin-error" role="alert"><p>{error}</p>{!state&&<button onClick={()=>void load()} disabled={busy}>다시 불러오기</button>}</div>}
    {notice&&<p role="status" className="brand-admin-notice">{notice}</p>}
    {result&&<SaveResult key={`${result.state.revision}-${result.publish}`} title={result.publish?'브랜드 소개를 게시했습니다.':'브랜드 소개 초안을 저장했습니다.'} status={result.publish?'게시 완료':'초안 저장 완료'} actions={<><Link className="button" href={ROOT}>관리 화면으로</Link><Link className="text-link" href={result.publish?'/about':`${ROOT}/preview`}>{result.publish?'고객 화면 보기':'저장된 초안 미리보기'}</Link></>}><p>{result.state.draft.title}</p><p>확정 버전 {result.state.revision} · {result.publish?'고객 화면에 반영되었습니다.':'고객 화면은 아직 변경되지 않았습니다.'}</p></SaveResult>}
    {blocked&&<section className="brand-recovery"><h2>최신 상태 확인이 필요합니다</h2><p>현재 입력을 보존한 채 서버의 저장 상태를 확인합니다.</p><button disabled={busy} onClick={()=>void recover()}>최신 상태 확인 · 입력 유지</button></section>}
    {latest&&<section className="brand-recovery"><h2>최신 저장본: {latest.draft.title}</h2><p>버전 {latest.revision} · 현재 입력은 유지되어 있습니다. 최신 저장 내용을 확인한 후 현재 입력으로 덮어쓸지 결정하세요.</p><details><summary>최신 저장 내용 확인</summary><BrandAboutView content={latest.draft} preview/></details><button disabled={busy} onClick={()=>{setState(latest);setLatest(null);setBlocked(false);setNotice('최신 버전을 기준으로 현재 입력을 저장할 수 있습니다. 아직 저장하지 않았습니다.');}}>현재 입력 유지하고 이 버전으로 저장 준비</button></section>}
    {!state&&!error&&<p role="status">불러오는 중입니다…</p>}
    {state&&content&&mode==='status'&&<><div className="brand-state-grid"><section><p className="eyebrow">SAVED DRAFT</p><h2>{state.draft.title}</h2><p>저장 버전 {state.revision}</p><Link className="button" href={`${ROOT}/edit`}>초안 편집</Link><Link className="text-link" href={`${ROOT}/preview`}>저장된 초안 미리보기</Link></section><section><p className="eyebrow">PUBLISHED</p><h2>{state.published.title}</h2><p>게시 버전 {state.published_revision}</p><Link className="text-link" href="/about">고객 화면 보기 ↗</Link></section></div><section className="brand-publish"><h2>저장된 초안을 고객에게 게시</h2><p>“{state.draft.title}” · 버전 {state.revision}의 내용과 이미지가 고객 화면에 표시됩니다.</p><button className="button" disabled={busy||blocked} onClick={()=>void mutate(true)}>{busy?'처리 중…':'이 초안 게시'}</button></section></>}
    {state&&mode==='preview'&&<><div className="button-row"><Link className="text-link" href={`${ROOT}/edit`}>초안 편집</Link><span>저장 버전 {state.revision}</span></div><BrandAboutView content={state.draft} preview/></>}
    {state&&content&&mode==='edit'&&<><form className="ds-form brand-editor" onSubmit={event=>{event.preventDefault();void mutate(false);}}><FormRequiredHint/><fieldset disabled={busy} className="editor-fieldset"><section className="brand-fields"><h2>브랜드 이야기</h2><TextField id="brand-eyebrow" label="상단 소개 문구" value={content.eyebrow} max={60} onChange={eyebrow=>change({...content,eyebrow})}/><TextField id="brand-title" label="메인 제목" value={content.title} max={100} onChange={title=>change({...content,title})}/><TextField id="brand-intro" label="브랜드 소개" multiline value={content.intro} max={1500} onChange={intro=>change({...content,intro})}/><TextField id="brand-philosophy-title" label="브랜드 철학 제목" optional value={content.philosophy_title} max={100} onChange={philosophy_title=>change({...content,philosophy_title})}/><TextField id="brand-philosophy-body" label="브랜드 철학 본문" optional multiline value={content.philosophy_body} max={2000} onChange={philosophy_body=>change({...content,philosophy_body})}/><p className="admin-note">철학은 제목과 본문을 함께 입력하세요. 둘 다 비우면 숨겨집니다. 빈 줄로 문단을 나눌 수 있습니다.</p><ImageField id="brand-hero" image={content.hero_image} alt={content.hero_alt} onImage={hero_image=>change({...content,hero_image})} onAlt={hero_alt=>change({...content,hero_alt})} onUpload={file=>void upload(file,{kind:'hero'})}/></section>
    {content.topics.map((topic,index)=><section className="brand-fields" key={topic.id}><div className="brand-field-heading"><h2>콘셉트 {index+1}</h2><button type="button" onClick={()=>change({...content,topics:content.topics.filter(t=>t.id!==topic.id)})}>콘셉트 삭제</button></div><TextField id={`${topic.id}-title`} label="콘셉트 제목" value={topic.title} max={80} onChange={title=>change({...content,topics:content.topics.map(t=>t.id===topic.id?{...t,title}:t)})}/><TextField id={`${topic.id}-description`} label="콘셉트 설명" multiline value={topic.description} max={800} onChange={description=>change({...content,topics:content.topics.map(t=>t.id===topic.id?{...t,description}:t)})}/><ImageField id={topic.id} image={topic.image} alt={topic.alt} onImage={image=>change({...content,topics:content.topics.map(t=>t.id===topic.id?{...t,image}:t)})} onAlt={alt=>change({...content,topics:content.topics.map(t=>t.id===topic.id?{...t,alt}:t)})} onUpload={file=>void upload(file,{kind:'topic',id:topic.id})}/><div className="button-row"><button type="button" disabled={index===0} onClick={()=>{const topics=[...content.topics];[topics[index-1],topics[index]]=[topics[index],topics[index-1]];change({...content,topics});}}>위로</button><button type="button" disabled={index===content.topics.length-1} onClick={()=>{const topics=[...content.topics];[topics[index],topics[index+1]]=[topics[index+1],topics[index]];change({...content,topics});}}>아래로</button></div></section>)}
    <div className="button-row"><button type="button" disabled={content.topics.length>=6} onClick={()=>change({...content,topics:[...content.topics,{id:crypto.randomUUID(),title:'',description:'',image:BRAND_PRESETS[1],alt:''}]})}>콘셉트 추가 ({content.topics.length}/6)</button><button type="button" onClick={()=>setLocalPreview(!localPreview)}>{localPreview?'입력 미리보기 닫기':'현재 입력 미리보기'}</button><button type="submit" className="button" disabled={blocked}>{busy?'처리 중…':'초안 저장'}</button></div></fieldset></form>{localPreview&&<section className="brand-local-preview"><h2>현재 입력 미리보기 · 저장 전</h2><BrandAboutView content={content} preview/></section>}</>}
  </main>;
}
function TextField({id,label,value,max,multiline,optional=false,onChange}:{id:string;label:string;value:string;max:number;multiline?:boolean;optional?:boolean;onChange:(value:string)=>void}) { const props={id,value,maxLength:max,required:!optional,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>onChange(e.target.value)};return <div className="brand-field"><FormLabel htmlFor={id} required={!optional}>{label}</FormLabel>{multiline?<textarea {...props} rows={5}/>:<input {...props}/>}</div>; }
function ImageField({id,image,alt,onImage,onAlt,onUpload}:{id:string;image:string;alt:string;onImage:(v:string)=>void;onAlt:(v:string)=>void;onUpload:(file:File|undefined)=>void}) {
 const options=BRAND_PRESETS.map((value,i)=>({value,label:['메인 · 개성을 입다','AI · 새로운 언어','전문분야 · 숨은 패턴','AI · HUMAN × AI'][i]}));if(!BRAND_PRESETS.includes(image))options.push({value:image,label:'업로드한 이미지'});
 return <div className="brand-image-field"><Image src={brandImageUrl(image,true)} alt={alt||'선택한 이미지 미리보기'} width={320} height={240} unoptimized/><div className="brand-fields"><div className="brand-field"><FormLabel htmlFor={`${id}-image`}>예시 이미지 선택</FormLabel><FormSelect id={`${id}-image`} value={image} options={options} onChange={onImage}/></div><div className="brand-field"><FormLabel htmlFor={`${id}-upload`}>다른 이미지 업로드</FormLabel><input id={`${id}-upload`} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{onUpload(e.target.files?.[0]);e.target.value='';}}/><p className="sample-note">PNG·JPEG·WebP, 최대 2 MiB. 업로드 후 초안을 저장해야 반영됩니다.</p></div><TextField id={`${id}-alt`} label="이미지 설명 (대체 텍스트)" value={alt} max={200} onChange={onAlt}/></div></div>;
}
