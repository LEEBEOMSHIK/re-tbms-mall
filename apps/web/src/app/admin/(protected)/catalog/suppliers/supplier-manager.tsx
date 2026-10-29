'use client';
import {KeyFacts,ValueStatus} from '@/components/ui/key-facts';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useListPagination} from '@/components/ui/list-pagination';
import {useRouter} from 'next/navigation';
import {supplierPhoneError,editSupplierPhone,supplierDetailsForSave,findSavedSupplier,rememberSupplierSave,supplierSaveReceipt} from '@/lib/supplier-form';
import {catalogRequest,parseCatalog,parseSupplier,supplierDetailLimits,type SupplierDetails,type Catalog,type Supplier} from '@/lib/catalog';
import {FormLabel,FormChoice,FormRequiredHint} from '@/components/ui/form-controls';
import {SaveResult} from '@/components/ui/save-result';
import '../catalog.css';
import './supplier.css';
import { SupplierAddress } from './supplier-address';
export function SupplierManager({mode='list',supplierId='',savedId='',savedVersion=''}:{mode?:'list'|'new'|'edit';supplierId?:string;savedId?:string;savedVersion?:string}){
 const [catalog,setCatalog]=useState<Catalog|null>(null),[error,setError]=useState('');
 async function load(){const r=await catalogRequest('/api/admin/catalog',parseCatalog);if(r.ok){setCatalog(r.data);setError('')}else setError('공급처를 불러오지 못했습니다. 로그인과 서버 상태를 확인해 주세요.');}
 useEffect(()=>{let active=true;void catalogRequest('/api/admin/catalog',parseCatalog).then(r=>{if(!active)return;if(r.ok){setCatalog(r.data);setError('')}else setError('공급처를 불러오지 못했습니다. 로그인과 서버 상태를 확인해 주세요.')});return()=>{active=false}},[]);
 const supplierPages=useListPagination(catalog?.suppliers||[],'suppliers','공장·공급처');
 const current=catalog?.suppliers?.find(s=>s.id===supplierId);
 const savedSupplier=catalog&&!error?findSavedSupplier(catalog.suppliers||[],savedId,savedVersion):undefined;
 const receipt=mode==='list'?supplierSaveReceipt(savedId,savedVersion):null;
 return <main id="main" className="catalog-manager"><header className="catalog-heading"><div><p className="eyebrow">재고 관리</p><h1>공장·공급처 {mode==='list'?'목록':mode==='new'?'등록':'수정'}</h1></div><Link className="catalog-link-button" href={mode==='list'?'/admin/catalog/inventory':'/admin/catalog/suppliers'}>{mode==='list'?'재고 현황으로':'공급처 목록으로'}</Link></header>
 {mode==='list'&&(savedSupplier||receipt)&&<SaveResult className="catalog-panel" title="공장·공급처 저장이 완료되었습니다" actions={<Link className="catalog-link-button" href="/admin/catalog/suppliers/new">다른 공급처 등록</Link>}><p><strong>{(savedSupplier||receipt)?.name}</strong></p><KeyFacts label="공장·공급처 저장 결과" items={[{label:'사용 상태',value:<ValueStatus tone={(savedSupplier||receipt)?.is_active?'success':'neutral'}>{(savedSupplier||receipt)?.is_active?'사용 중':'사용 중지'}</ValueStatus>}]}/><p>{savedSupplier?'목록에서 저장된 공급처를 확인했습니다.':error?'저장은 완료되었지만 최신 목록을 불러오지 못했습니다. 다시 등록하지 말고 목록을 다시 불러와 주세요.':catalog?'저장은 완료되었지만 목록에서 해당 결과를 확인하지 못했습니다. 목록을 다시 불러와 주세요.':'최신 목록을 확인하고 있습니다.'}</p></SaveResult>}
 {mode==='list'&&savedId&&catalog&&!error&&!savedSupplier&&<p role="alert">요청한 저장 결과를 최신 목록에서 확인하지 못했습니다. 목록을 확인한 뒤 다시 불러와 주세요.<button type="button" className="catalog-link-button" onClick={()=>void load()}>다시 불러오기</button></p>}
 {error&&<div role="alert">{error}<button onClick={()=>void load()}>다시 불러오기</button></div>}
 {!catalog&&!error&&<p role="status">공급처를 불러오는 중입니다.</p>}
 {catalog&&(mode==='list'?<section className="catalog-panel catalog-list-stack"><div className="catalog-actions"><Link className="catalog-link-button catalog-primary" href="/admin/catalog/suppliers/new">공장·공급처 등록</Link></div><p className="catalog-note">사용 중인 공장·공급처를 입고할 때 선택할 수 있습니다.</p>{supplierPages.summary}{!catalog.suppliers?.length?<p className="catalog-empty-state">등록된 공장·공급처가 없습니다.</p>:<div className="catalog-table-scroll" tabIndex={0} role="region" aria-label="공장·공급처 목록"><table><thead><tr><th>공장·공급처명</th><th>연락처</th><th>사용 상태</th><th>관리</th></tr></thead><tbody>{supplierPages.items.map(s=><tr key={s.id}><td><strong className="catalog-row-identity">{s.name}</strong>{s.english_name && <small>{s.english_name}</small>}</td><td className="supplier-list-contact"><span>{s.contact_name?`담당자 ${s.contact_name}`:'담당자 미등록'}</span><small>담당 전화 {s.contact_phone||'미등록'}</small><small>대표 전화 {s.phone||'미등록'}</small><details><summary aria-label={`${s.name} 연락처 상세`}>연락처 상세</summary><dl><div><dt>대표자</dt><dd>{s.representative_name||'미등록'}</dd></div><div><dt>담당자</dt><dd>{s.contact_name||'미등록'}</dd></div><div><dt>이메일</dt><dd>{s.email||'미등록'}</dd></div></dl></details></td><td><ValueStatus tone={s.is_active?'success':'neutral'}>{s.is_active?'사용 중':'사용 중지'}</ValueStatus></td><td><Link className="catalog-link-button" href={`/admin/catalog/suppliers/${s.id}/edit`}>수정</Link></td></tr>)}</tbody></table></div>}{supplierPages.navigation}</section>:mode==='edit'&&!current?<p role="alert">공급처를 찾을 수 없습니다.</p>:<SupplierForm key={current?.id||'new'} initial={current} countryCodes={catalog.country_codes || []}/>)}
 </main>
}
const detailLabels: Record<keyof SupplierDetails, string> = {
  english_name: '영문명', representative_name: '대표자명', phone: '대표전화', business_number: '사업자등록번호',
  contact_name: '담당자명', contact_phone: '담당자 연락처', email: '이메일', country_code: '국가', region: '주·도·지역', city: '도시', postal_code: '우편번호', address: '주소', address_detail: '상세 주소', memo: '메모',
};
const groups: { title: string; fields: (keyof SupplierDetails)[] }[] = [
  { title: '기본 정보', fields: ['english_name', 'representative_name', 'business_number'] },
  { title: '연락처', fields: ['phone', 'contact_name', 'contact_phone', 'email'] },

];
function SupplierForm({ initial, countryCodes }: { initial?: Supplier; countryCodes: string[] }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name || '');
  const [details, setDetails] = useState<SupplierDetails>(() => Object.fromEntries(Object.keys(supplierDetailLimits).map(key => [key, initial?.[key as keyof SupplierDetails] || ''])) as SupplierDetails);
  const [phoneEditErrors,setPhoneEditErrors] = useState({phone:'',contact_phone:''});
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Supplier | null>(null);
  const guard = useRef(false);
  function changeDetail(key: keyof SupplierDetails, value: string) {
    if (key === 'phone' || key === 'contact_phone') {
      const edit = editSupplierPhone(details[key],value);
      setPhoneEditErrors(current=>({...current,[key]:edit.error}));
      setDetails(current=>({...current,[key]:edit.value}));
    } else setDetails(current=>({...current,[key]:value}));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (guard.current || saved) return;
    for (const key of ['phone','contact_phone'] as const) {
      if(phoneEditErrors[key]){setError(`${detailLabels[key]}: 반영하지 않은 입력이 있습니다. 번호를 수정하거나 현재 표시된 값을 확인해 주세요.`);document.getElementById(`supplier-${key}`)?.focus();return;}
      if (initial && details[key] === initial[key]) continue;
      const message=supplierPhoneError(details[key]);
      if(message){setError(`${detailLabels[key]}: ${message}`);document.getElementById(`supplier-${key}`)?.focus();return;}
    }
    guard.current = true; setBusy(true); setError('');
    let confirmed = false;
    try {
      const result = await catalogRequest(initial ? `/api/admin/suppliers/${initial.id}` : '/api/admin/suppliers', parseSupplier, {
        method: initial ? 'PUT' : 'POST', body: { name, ...supplierDetailsForSave(details,initial), is_active: active, ...(initial ? { version: initial.version } : {}) },
      });
      if (result.ok) { confirmed = true; setSaved(result.data); rememberSupplierSave(result.data); router.replace(`/admin/catalog/suppliers?saved=${encodeURIComponent(result.data.id)}&version=${result.data.version}`); }
      else setError(result.reason === 'conflict' ? '동일한 이름이 있거나 다른 관리자가 수정했습니다. 목록에서 최신 내용을 확인해 주세요.' : result.reason === 'validation' ? '공급처명과 각 항목의 형식·길이를 확인해 주세요.' : result.reason === 'auth' ? '로그인이 만료되었습니다. 다시 로그인해 주세요.' : '저장 결과를 확인하지 못했습니다. 입력은 유지됩니다. 다시 등록하기 전에 목록을 확인해 주세요.');
    } finally { guard.current = confirmed; setBusy(false); }
  }
  if (saved) return <SaveResult className="catalog-panel" title="저장이 완료되어 공급처 목록으로 이동합니다" actions={<Link className="catalog-link-button" href={`/admin/catalog/suppliers?saved=${encodeURIComponent(saved.id)}&version=${saved.version}`}>공급처 목록으로</Link>}><p>{saved.name}</p></SaveResult>;
  return <section className="catalog-panel catalog-form-panel catalog-form-wide"><form id="supplier-form" className="ds-form supplier-form" onSubmit={event => void submit(event)}>
    <FormRequiredHint />{error && <p className="admin-session-error" role="alert">{error}</p>}
    <fieldset disabled={busy} className="supplier-fields">
      {groups.map((group, index) => <section className="supplier-form-group" key={group.title} aria-labelledby={`supplier-group-${index}`}>
        <h2 id={`supplier-group-${index}`}>{group.title}</h2><div className="supplier-field-grid">
          {index === 0 && <div className="supplier-field"><FormLabel htmlFor="supplier-name" required>공장·공급처명</FormLabel><input id="supplier-name" aria-labelledby="supplier-name-label" required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></div>}
          {group.fields.map(key => <div key={key} className={`supplier-field${['address', 'address_detail', 'memo'].includes(key) ? ' supplier-field-wide' : ''}`}>
            <FormLabel htmlFor={`supplier-${key}`} hint="선택">{detailLabels[key]}</FormLabel>
            {key === 'memo' ? <textarea id={`supplier-${key}`} aria-labelledby={`supplier-${key}-label`} maxLength={supplierDetailLimits[key]} rows={4} value={details[key]} onChange={event => changeDetail(key,event.target.value)} /> : <input id={`supplier-${key}`} aria-labelledby={`supplier-${key}-label`} type={key === 'email' ? 'email' : key === 'phone' || key === 'contact_phone' ? 'tel' : 'text'} maxLength={key === 'phone' || key === 'contact_phone' ? undefined : supplierDetailLimits[key]} aria-describedby={key === 'phone' || key === 'contact_phone' ? `supplier-${key}-help` : undefined} aria-invalid={(key === 'phone' || key === 'contact_phone') && (!!phoneEditErrors[key] || ((!initial || details[key] !== initial[key]) && !!supplierPhoneError(details[key]))) || undefined} value={details[key]} onChange={event => changeDetail(key,event.target.value)} />}
            {(key === 'phone' || key === 'contact_phone') && <p id={`supplier-${key}-help`} className="catalog-note" aria-live="polite">{phoneEditErrors[key] || (!initial || details[key] !== initial[key]) && supplierPhoneError(details[key]) || '국내 숫자 최대 11자리 · 해외 +국가번호 포함 최대 15자리. 하이픈·공백은 자리 수에서 제외합니다.'}</p>}
            {(key === 'phone' || key === 'contact_phone') && phoneEditErrors[key] && <button type="button" className="catalog-link-button" onClick={()=>{setPhoneEditErrors(current=>({...current,[key]:''}));setError('');document.getElementById(`supplier-${key}`)?.focus();}}>{details[key]?'현재 표시된 번호 사용':'빈 값 유지'}</button>}
          </div>)}
        </div>
      </section>)}
      <SupplierAddress value={details} countryCodes={countryCodes} disabled={busy} onChange={patch => setDetails(current => ({ ...current, ...patch }))} />
      <section className="supplier-form-group" aria-labelledby="supplier-memo-title"><h2 id="supplier-memo-title">메모</h2><div className="supplier-field"><FormLabel htmlFor="supplier-memo" hint="선택">메모</FormLabel><textarea id="supplier-memo" aria-labelledby="supplier-memo-label" maxLength={1000} rows={4} value={details.memo} onChange={event => setDetails({ ...details, memo: event.target.value })} /></div></section>
      <div className="supplier-state"><FormChoice id="supplier-active" label="사용 중" className="ds-choice-compact" checked={active} onChange={event => setActive(event.target.checked)} /><p className="catalog-note">사용 중지하면 새 입고에서 선택할 수 없습니다. 기존 입고 내역은 유지됩니다.</p></div>
      <div className="catalog-actions"><button type="submit" className="catalog-primary">{busy ? '저장 중…' : initial ? '수정 저장' : '공급처 등록'}</button><Link className="catalog-link-button" href="/admin/catalog/suppliers">취소하고 목록으로</Link></div>
    </fieldset>
  </form></section>;
}


