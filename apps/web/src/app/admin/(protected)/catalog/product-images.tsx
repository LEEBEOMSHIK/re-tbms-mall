/* eslint-disable @next/next/no-img-element -- Authenticated local data URLs require no public image optimizer. */
'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {catalogRequest,parseCatalog,type ProductDraft} from '@/lib/catalog';
import {parseProductImage,parseProductImages,type ProductImage,type ImageKind} from '@/lib/product-images';
import {FormLabel,FormRequiredHint,FormSelect} from '@/components/ui/form-controls';
import {SaveResult} from '@/components/ui/save-result';
import './catalog.css';
import './product-images.css';

const groups:{kind:ImageKind;title:string;audience:string}[]=[
  {kind:'design',title:'내부 시안',audience:'관리자 전용'},
  {kind:'model',title:'모델 착용 이미지',audience:'고객용'},
  {kind:'garment',title:'의류 단독 이미지',audience:'고객용'},
];
type ImageScope='customer'|'design';
const inScope=(kind:ImageKind,scope:ImageScope)=>scope==='design'?kind==='design':kind!=='design';
let uploadReceipt:{id:string;productId:string;name:string;scope:ImageScope}|null=null;
const parseImageListForProduct=(productId:string)=>(raw:unknown)=>{const result=parseProductImages(raw);if(result.images.some(image=>image.product_id!==productId))throw Error('Unexpected product image');return result;};
const endpoint=(productId:string)=>`/api/admin/products/${encodeURIComponent(productId)}/images`;

export function ProductImages({productId,savedImageId='',scope='customer'}:{productId:string;savedImageId?:string;scope?:ImageScope}){
 const [images,setImages]=useState<ProductImage[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [target,setTarget]=useState<ProductImage|null>(null),[busy,setBusy]=useState(false),[deleteError,setDeleteError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLButtonElement|null>(null),result=useRef<HTMLParagraphElement>(null),lock=useRef(false);
 async function reload(){const response=await catalogRequest(endpoint(productId),parseImageListForProduct(productId));if(response.ok){setImages(response.data.images);setLoaded(true);setError('')}else setError('이미지를 불러오지 못했습니다. 로그인과 서버 상태를 확인한 뒤 다시 불러와 주세요.');}
 useEffect(()=>{let active=true;void catalogRequest(endpoint(productId),parseImageListForProduct(productId)).then(response=>{if(!active)return;if(response.ok){setImages(response.data.images);setLoaded(true);setError('')}else setError('이미지를 불러오지 못했습니다. 로그인과 서버 상태를 확인한 뒤 다시 불러와 주세요.')});return()=>{active=false}},[productId]);
 useEffect(()=>{if(target){dialog.current?.showModal();cancel.current?.focus()}},[target]);
 const saved=images.find(image=>image.id===savedImageId&&image.product_id===productId&&inScope(image.kind,scope));
 const receipt=uploadReceipt?.id===savedImageId&&uploadReceipt.productId===productId&&uploadReceipt.scope===scope?uploadReceipt:null;
 async function remove(){
  if(!target||lock.current)return;lock.current=true;setBusy(true);setDeleteError('');
  const deleting=target;
  const response=await catalogRequest(`${endpoint(productId)}/${encodeURIComponent(deleting.id)}`,raw=>{if(!raw||typeof raw!=='object'||!('id' in raw)||raw.id!==deleting.id)throw Error('Invalid deletion');return {id:deleting.id}}, {method:'DELETE',body:{}});
  if(response.ok){setImages(current=>current.filter(image=>image.id!==deleting.id));if(uploadReceipt?.id===deleting.id)uploadReceipt=null;setNotice(`${deleting.name} 이미지를 삭제했습니다.`);dialog.current?.close();requestAnimationFrame(()=>{result.current?.focus();result.current?.scrollIntoView({block:'center'})})}
  else setDeleteError('삭제 결과를 확인하지 못했습니다. 입력을 유지했습니다. 취소 후 이미지 목록을 다시 불러와 확인해 주세요.');
  lock.current=false;setBusy(false);
 }
 return <section className="product-images" aria-label={scope==='design'?'내부 시안 이미지 관리':'고객용 상품 이미지 관리'}>
  {(saved||receipt)&&<SaveResult title="이미지 등록이 완료되었습니다" actions={<Link className="catalog-link-button" href={`/admin/catalog/${encodeURIComponent(productId)}/images/new?kind=${scope==='design'?'design':'model'}`}>다른 이미지 등록</Link>}><p className="catalog-confirmed-identity">{saved?.name||receipt?.name}</p><p>{saved?'저장된 이미지를 아래 목록에서 확인했습니다.':error?'등록은 완료되었지만 이미지 목록을 불러오지 못했습니다. 다시 등록하지 말고 목록을 다시 불러와 주세요.':loaded?'등록한 이미지를 현재 목록에서 찾지 못했습니다. 목록을 다시 불러와 주세요.':'저장된 이미지 목록을 확인하고 있습니다.'}</p></SaveResult>}
  <p className="catalog-note">{scope==='design'?'내부 시안은 관리자만 관리하며, 공유로 지정한 이미지만 담당 공장에 제공됩니다.':'모델·의류 이미지는 상품을 게시하면 고객 화면에 표시됩니다.'}</p>
  <div className="catalog-actions"><button type="button" disabled={busy} onClick={()=>void reload()}>이미지 목록 새로고침</button></div>
  {error&&<p role="alert" className="admin-session-error">{error}</p>}
  {!loaded&&!error&&<p role="status">이미지를 불러오는 중입니다.</p>}
  {savedImageId&&loaded&&!error&&!saved&&!receipt&&<p role="status">요청한 이미지를 현재 목록에서 확인할 수 없습니다.</p>}
  <p ref={result} tabIndex={-1} role="status">{notice}</p>
  {loaded&&groups.filter(group=>inScope(group.kind,scope)).map(group=>{const items=images.filter(image=>image.kind===group.kind);return <section className="product-image-group" key={group.kind} aria-labelledby={`image-group-${group.kind}`}>
   <header><div><h3 id={`image-group-${group.kind}`}>{group.title}</h3><p className="catalog-note">{group.audience} · {items.length}/10개</p></div><Link className="catalog-link-button" href={`/admin/catalog/${encodeURIComponent(productId)}/images/new?kind=${group.kind}`}>{group.title} 등록</Link></header>
   {!items.length?<p className="catalog-empty-state">등록된 {group.title}가 없습니다.</p>:<ul className="product-image-grid">{items.map(image=><li key={image.id}><figure><img src={image.data_url} alt={image.alt||image.name}/><figcaption><strong>{image.name}</strong>{image.alt&&<p>{image.alt}</p>}</figcaption></figure><button type="button" disabled={busy} onClick={event=>{trigger.current=event.currentTarget;setDeleteError('');setTarget(image)}} aria-label={`${image.name} 이미지 삭제`}>삭제</button></li>)}</ul>}
  </section>})}
  <dialog ref={dialog} className="catalog-delete-dialog" aria-labelledby="image-delete-heading" onClose={()=>{setTarget(null);trigger.current?.focus()}} onCancel={event=>{if(lock.current)event.preventDefault()}}>
   <h2 id="image-delete-heading">이미지를 삭제할까요?</h2><p>{target?.name}</p><p>삭제 후에는 파일을 다시 등록해야 합니다.</p>{deleteError&&<p role="alert" className="admin-session-error">{deleteError}</p>}
   <div className="catalog-delete-actions"><button ref={cancel} type="button" disabled={busy} onClick={()=>dialog.current?.close()}>취소</button><button type="button" disabled={busy} onClick={()=>void remove()}>{busy?'삭제 중…':'이미지 삭제'}</button></div>
  </dialog>
 </section>;
}

export function ProductImageUploader({productId,initialKind='model'}:{productId:string;initialKind?:ImageKind}){
 const scope:ImageScope=initialKind==='design'?'design':'customer';const returnPath=scope==='design'?`/admin/factories/progress/${encodeURIComponent(productId)}`:`/admin/catalog/${encodeURIComponent(productId)}`;const returnLabel=scope==='design'?'시안 상세로':'상품 상세로';
 const router=useRouter();const [product,setProduct]=useState<ProductDraft|null>(null),[loaded,setLoaded]=useState(false),[loadError,setLoadError]=useState('');
 const [kind,setKind]=useState<ImageKind>(initialKind),[name,setName]=useState(''),[alt,setAlt]=useState(''),[dataUrl,setDataUrl]=useState(''),[fileError,setFileError]=useState(''),[reading,setReading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<ProductImage|null>(null);
 const [dragActive,setDragActive]=useState(false),[selectedFileName,setSelectedFileName]=useState('');const dragDepth=useRef(0),fileInput=useRef<HTMLInputElement>(null);
 const lock=useRef(false),generation=useRef(0),pending=useRef<{id:string;kind:ImageKind;name:string;alt:string;data_url:string}|null>(null);
 async function load(){const response=await catalogRequest('/api/admin/catalog',parseCatalog);if(response.ok){setProduct(response.data.products.find(item=>item.id===productId)||null);setLoaded(true);setLoadError('')}else setLoadError('상품을 불러오지 못했습니다. 로그인과 서버 상태를 확인해 주세요.');}
 useEffect(()=>{let active=true;void catalogRequest('/api/admin/catalog',parseCatalog).then(response=>{if(!active)return;if(response.ok){setProduct(response.data.products.find(item=>item.id===productId)||null);setLoaded(true)}else setLoadError('상품을 불러오지 못했습니다. 로그인과 서버 상태를 확인해 주세요.')});return()=>{active=false;generation.current+=1}},[productId]);
 function selectFiles(files:File[]){
  if(lock.current||busy||saved)return;
  if(files.length!==1){generation.current+=1;setReading(false);setFileError('이미지는 한 번에 한 개만 등록할 수 있습니다. 파일 한 개를 다시 선택해 주세요.');return;}
  selectFile(files[0]);
 }
 function selectFile(file?:File){
  if(lock.current||busy||saved)return;
  const attempt=++generation.current;setReading(false);
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024||file.size===0){setFileError('2MB 이하의 PNG, JPEG, WebP 이미지를 선택해 주세요. 이 파일은 반영하지 않았습니다.');return;}
  setReading(true);setFileError('');const reader=new FileReader();
  reader.onload=()=>{if(attempt!==generation.current)return;setReading(false);if(typeof reader.result!=='string'){setFileError('파일을 읽지 못했습니다. 다시 선택해 주세요.');return;}setDataUrl(reader.result);setName(file.name);setSelectedFileName(file.name);};
  reader.onerror=()=>{if(attempt===generation.current){setReading(false);setFileError('파일을 읽지 못했습니다. 다시 선택해 주세요.')}};
  reader.readAsDataURL(file);
 }
 async function submit(event:FormEvent){
  event.preventDefault();if(lock.current||saved||!product||reading)return;
  if(fileError||!dataUrl){setError('유효한 이미지 파일을 선택해 주세요.');document.getElementById('product-image-file')?.focus();return;}
  if(!name.trim()||name.trim().length>120||alt.trim().length>240){setError('이미지 이름은 필수이며 최대 120자입니다. 설명은 선택이며 최대 240자입니다.');return;}
  lock.current=true;setBusy(true);setError('');
  const payload={kind:scope==='design'?'design' as const:kind==='garment'?'garment' as const:'model' as const,name:name.trim(),alt:alt.trim(),data_url:dataUrl};
  if(!pending.current||pending.current.kind!==payload.kind||pending.current.name!==payload.name||pending.current.alt!==payload.alt||pending.current.data_url!==payload.data_url)pending.current={id:crypto.randomUUID(),...payload};
  const request=pending.current;
  const response=await catalogRequest(endpoint(productId),raw=>{const image=parseProductImage(raw);if(image.id!==request.id||image.product_id!==productId||image.kind!==request.kind)throw Error('Invalid confirmation');return image},{method:'POST',body:request});
  if(response.ok){setSaved(response.data);uploadReceipt={id:response.data.id,productId,name:response.data.name,scope};router.replace(`${returnPath}?saved_image=${encodeURIComponent(response.data.id)}`)}
  else {setError(response.reason==='conflict'?'이 종류에는 최대 10개까지 등록할 수 있습니다. 목록과 동일 요청의 처리 여부를 확인해 주세요.':response.reason==='validation'?'이미지 파일의 형식·용량과 이름·설명을 확인해 주세요. 입력은 유지됩니다.':response.reason==='auth'?'로그인이 만료되었습니다. 다시 로그인해 주세요.':'저장 결과를 확인하지 못했습니다. 입력은 유지됩니다. 같은 입력으로 다시 시도하거나 이미지 목록에서 저장 여부를 확인해 주세요.');lock.current=false;}
  setBusy(false);
 }
 return <main id="main" className="catalog-manager" onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect='none'}} onDrop={event=>event.preventDefault()}><header className="catalog-heading"><div><p className="eyebrow">{scope==='design'?'공장 협업':'상품 관리'}</p><h1>{scope==='design'?'내부 시안 등록':'상품 이미지 등록'}</h1></div><Link className="catalog-link-button" href={returnPath}>{returnLabel}</Link></header>
  {loadError&&<div role="alert">{loadError}<button type="button" onClick={()=>void load()}>다시 불러오기</button></div>}
  {!loaded&&!loadError&&<p role="status">상품을 불러오는 중입니다.</p>}
  {loaded&&!product&&<p role="alert">상품을 찾을 수 없습니다. 상품 목록에서 다시 선택해 주세요.</p>}
  {saved?<SaveResult title={scope==='design'?'이미지 등록이 완료되어 시안 상세로 이동합니다':'이미지 등록이 완료되어 상품 상세로 이동합니다'} actions={<Link className="catalog-link-button" href={`${returnPath}?saved_image=${encodeURIComponent(saved.id)}`}>{returnLabel}</Link>}><p>{saved.name}</p></SaveResult>:product&&<section className="catalog-panel catalog-form-panel catalog-form-wide"><h2>{product.name}</h2><p className="catalog-note">{product.internal_name} · 한 번에 이미지 한 개를 등록합니다. 종류별 최대 10개, 파일당 최대 2MB, 가로·세로 각각 4096px 및 총 1,600만 화소 이내입니다.</p><form className="ds-form product-image-form" onSubmit={event=>void submit(event)}><FormRequiredHint/>{error&&<p role="alert" className="admin-session-error">{error}</p>}<fieldset disabled={busy}>
   {scope==='customer'&&<div className="catalog-field"><FormLabel htmlFor="product-image-kind" required>이미지 종류</FormLabel><FormSelect id="product-image-kind" required value={kind} onChange={value=>setKind(value as ImageKind)} options={groups.filter(group=>inScope(group.kind,scope)).map(group=>({value:group.kind,label:`${group.title} (${group.audience})`}))}/></div>}
   <div className="catalog-field"><FormLabel htmlFor="product-image-file" required>이미지 파일</FormLabel><div className="product-image-dropzone" data-drag-active={dragActive} aria-busy={reading||busy}
    onDragEnter={event=>{event.preventDefault();event.stopPropagation();if(lock.current||busy)return;dragDepth.current+=1;setDragActive(true)}}
    onDragOver={event=>{event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect=lock.current||busy?'none':'copy'}}
    onDragLeave={event=>{event.preventDefault();event.stopPropagation();dragDepth.current=Math.max(0,dragDepth.current-1);if(dragDepth.current===0)setDragActive(false)}}
    onDrop={event=>{event.preventDefault();event.stopPropagation();dragDepth.current=0;setDragActive(false);if(lock.current||busy)return;const files=Array.from(event.dataTransfer.files);if(fileInput.current)fileInput.current.value='';selectFiles(files)}}>
    <p className="product-image-drop-title">{dragActive?'여기에 이미지 한 개를 놓으세요':'이미지를 끌어다 놓거나 파일을 선택하세요'}</p>
    <p className="catalog-note">한 번에 한 개 · PNG, JPEG, WebP · 최대 2MB</p>
    <input ref={fileInput} id="product-image-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{const files=Array.from(event.target.files||[]);if(files.length)selectFiles(files)}} aria-describedby="product-image-file-help product-image-selected-file" aria-invalid={!!fileError}/>
    <p id="product-image-selected-file" className="catalog-note" aria-live="polite">{selectedFileName?`미리보기 파일: ${selectedFileName}`:'선택한 이미지가 없습니다.'}</p>
   </div><p id="product-image-file-help" className="catalog-note" aria-live="polite">{fileError|| (reading?'이미지를 읽는 중입니다.':'PNG, JPEG, WebP · 최대 2MB · 가로·세로 4096px 및 1,600만 화소 이내')}</p></div>
   {dataUrl&&<figure className="product-image-preview"><img src={dataUrl} alt={alt||name||'선택한 이미지 미리보기'}/><figcaption>저장 전 미리보기</figcaption></figure>}
   <div className="catalog-field"><FormLabel htmlFor="product-image-name" required>이미지 이름</FormLabel><input id="product-image-name" required maxLength={120} value={name} onChange={event=>setName(event.target.value)}/></div>
   <div className="catalog-field"><FormLabel htmlFor="product-image-alt">이미지 설명</FormLabel><textarea id="product-image-alt" maxLength={240} rows={3} value={alt} onChange={event=>setAlt(event.target.value)}/><p className="catalog-note">필요한 경우 이미지의 특징을 적어 주세요. 설명이 없으면 이미지 이름을 대체 텍스트로 사용합니다.</p></div>
   <p className="catalog-note">{kind==='design'?'공유로 지정한 시안만 담당 공장에 제공됩니다.':'모델·의류 이미지는 게시 중인 상품의 고객 화면에도 반영됩니다.'}</p>
   <div className="catalog-actions"><button className="catalog-primary" type="submit" disabled={busy||reading}>{busy?'등록 중…':'이미지 등록'}</button><Link className="catalog-link-button" href={returnPath}>취소하고 {returnLabel}</Link></div>
  </fieldset></form></section>}
 </main>;
}

