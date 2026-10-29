'use client';
import {ProductImages} from '../../catalog/product-images';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {FactoryNav} from '../factory-nav';
import {catalogRequest,parseCatalog,type Catalog} from '@/lib/catalog';
import {parseAdminFactoryWorkspace,progressStatusLabels,type AdminFactoryWorkspace} from '@/lib/factory';
import {ProductProgress,ProgressBadge} from '@/components/product-progress';
import {FormLabel,FormSelect} from '@/components/ui/form-controls';
import {useListPagination} from '@/components/ui/list-pagination';
import '../../catalog/catalog.css';
import './admin-progress.css';

const base='/admin/factories/progress';

function useProgressSources(includeWorkspace:boolean) {
  const [catalog,setCatalog]=useState<Catalog|null>(null);
  const [workspace,setWorkspace]=useState<AdminFactoryWorkspace|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    void Promise.all([
      catalogRequest('/api/admin/catalog',parseCatalog),
      includeWorkspace?catalogRequest('/api/admin/factory-workspace',parseAdminFactoryWorkspace):Promise.resolve(null),
    ]).then(([c,w])=>{
      if(!active)return;
      if(c.ok&&(!includeWorkspace||w?.ok)) {
        setCatalog(c.data);if(w?.ok)setWorkspace(w.data);setError('');
      } else {
        setError('시안 관리 정보를 불러오지 못했습니다. 로그인과 서버 상태를 확인한 뒤 다시 조회해 주세요.');
      }
    });
    return()=>{active=false};
  },[attempt,includeWorkspace]);
  function retry(){setError('');setCatalog(null);setWorkspace(null);setAttempt(value=>value+1)}
  return {catalog,workspace,error,retry};
}

function LoadError({message,retry}:{message:string;retry:()=>void}) {
  return <section className="catalog-panel admin-progress-error" role="alert"><p>{message}</p><div className="admin-progress-actions"><button type="button" onClick={retry}>다시 조회</button><Link className="catalog-link-button" href="/admin/login">로그인 확인</Link></div></section>;
}

export function AdminProgressList() {
  const {catalog,workspace,error,retry}=useProgressSources(true);
  const [search,setSearch]=useState('');
  const [supplierId,setSupplierId]=useState('all');
  const [status,setStatus]=useState('all');
  const rows=(catalog?.products||[]).map(product=>{
    const assignment=workspace?.assignments.find(item=>item.product_id===product.id);
    const supplier=catalog?.suppliers?.find(item=>item.id===assignment?.supplier_id);
    return {product,assignment,supplier};
  });
  const query=search.trim().toLocaleLowerCase();
  const filtered=rows.filter(({product,assignment,supplier})=>
    (!query||`${product.name} ${product.internal_name} ${supplier?.name||''}`.toLocaleLowerCase().includes(query))&&
    (supplierId==='all'||(supplierId==='unassigned'?!assignment:assignment?.supplier_id===supplierId))&&
    (status==='all'||(status==='unassigned'?!assignment:assignment?.progress_status===status)),
  );
  const pages=useListPagination(filtered,JSON.stringify([search,supplierId,status]),'시안 상품');
  return <main id="main" className="catalog-manager admin-progress-page">
    <header className="catalog-heading"><div><p className="eyebrow">공장 협업</p><h1>시안 관리</h1></div><Link className="catalog-link-button" href="/admin/factories/requests/new">추가 제작 요청</Link></header>
    <FactoryNav/>
    <p className="admin-progress-intro">상품별 담당 공장과 시안·샘플 작업 상태를 확인하세요. 상품을 선택하면 상세 이력과 상태 변경 화면으로 이동할 수 있습니다.</p>
    {error?<LoadError message={error} retry={retry}/>:!catalog||!workspace?<p role="status">시안 목록을 불러오는 중입니다.</p>:<section className="catalog-panel admin-progress-list">
      <div className="ds-form admin-progress-filters" aria-label="시안 목록 필터">
        <div><FormLabel htmlFor="admin-progress-search">상품·공장 검색</FormLabel><input id="admin-progress-search" type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="상품명, 내부 관리명, 공장명"/></div>
        <div><FormLabel htmlFor="admin-progress-supplier">담당 공장</FormLabel><FormSelect id="admin-progress-supplier" value={supplierId} onChange={setSupplierId} options={[{value:'all',label:'전체 공장'},{value:'unassigned',label:'공장 미배정'},...(catalog.suppliers||[]).map(supplier=>({value:supplier.id,label:supplier.name+(supplier.is_active?'':' · 사용 중지')}))]}/></div>
        <div><FormLabel htmlFor="admin-progress-status">작업 상태</FormLabel><FormSelect id="admin-progress-status" value={status} onChange={setStatus} options={[{value:'all',label:'전체 상태'},{value:'unassigned',label:'공장 미배정'},...Object.entries(progressStatusLabels).map(([value,label])=>({value,label}))]}/></div>
      </div>
      {filtered.length>0&&pages.summary}
      {!filtered.length?<p className="catalog-empty-state">{rows.length?'선택한 조건에 맞는 상품이 없습니다.':'등록된 상품이 없습니다.'}</p>:<div className="catalog-table-scroll" role="region" aria-label="시안 상품 목록" tabIndex={0}><table><thead><tr><th>상품</th><th>담당 공장</th><th>작업 상태</th><th>관리</th></tr></thead><tbody>{pages.items.map(({product,assignment,supplier})=><tr key={product.id}>
        <td><Link className="admin-progress-product-link" href={`${base}/${encodeURIComponent(product.id)}`}>{product.name}<span aria-hidden="true">↗</span></Link><small className="admin-progress-list-code">{product.internal_name}</small></td>
        <td>{assignment?(supplier?.name||'공장 정보 확인 필요'):'공장 미배정'}</td>
        <td>{assignment?<ProgressBadge status={assignment.progress_status}/>:<span className="admin-progress-unassigned">공장 미배정</span>}</td>
        <td><Link className="catalog-link-button" href={`${base}/${encodeURIComponent(product.id)}`} aria-label={`${product.name} 상세·이력`}>시안 상세</Link></td>
      </tr>)}</tbody></table></div>}
      {filtered.length>0&&pages.navigation}
    </section>}
  </main>;
}

export function AdminProgressDetail({productId,mode,savedVersion,savedImageId}:{productId:string;mode:'view'|'edit';savedVersion?:string;savedImageId?:string}) {
  const {catalog,error,retry}=useProgressSources(false);
  const product=catalog?.products.find(item=>item.id===productId);
  return <main id="main" className="catalog-manager admin-progress-page">
    <header className="catalog-heading"><div><p className="eyebrow">공장 협업</p><h1>{mode==='edit'?'시안 상태 변경':'시안 상세'}</h1></div><Link className="catalog-link-button" href={mode==='edit'?`${base}/${encodeURIComponent(productId)}`:base}>{mode==='edit'?'시안 상세로':'시안 목록으로'}</Link></header>
    {error?<LoadError message={error} retry={retry}/>:!catalog?<p role="status">상품 정보를 불러오는 중입니다.</p>:!product?<section className="catalog-panel" role="alert"><p>상품을 찾을 수 없습니다. 삭제되었거나 주소가 올바르지 않을 수 있습니다.</p><Link className="catalog-link-button" href={base}>목록으로 이동</Link></section>:<>
      <section className="catalog-panel admin-progress-product" aria-label="작업 대상 상품"><div><p className="small-label">작업 대상 상품</p><h2>{product.name}</h2></div><dl><div><dt>내부 관리명</dt><dd className="admin-progress-code">{product.internal_name}</dd></div><div><dt>카테고리</dt><dd>{product.category}</dd></div></dl><div className="admin-progress-actions"><Link className="catalog-link-button" href={`/admin/catalog/${encodeURIComponent(productId)}`}>상품 상세</Link><Link className="catalog-link-button" href={`/admin/catalog/${encodeURIComponent(productId)}/factory`}>담당 공장·시안 공유 설정</Link>{mode==='view'&&<Link className="catalog-link-button" href={`/admin/factories/requests/new?product_id=${encodeURIComponent(productId)}`}>추가 제작 요청</Link>}</div></section>
    </>}
    {mode==='view'&&(!catalog||product)&&<section className="catalog-panel"><h2>시안 이미지</h2><ProductImages key={productId} productId={productId} scope="design" savedImageId={savedImageId}/></section>}
    {(mode==='view'?(!catalog||Boolean(product)||savedVersion!==undefined):Boolean(product)&&!error)&&<ProductProgress key={`${productId}-${mode}`} productId={productId} scope="admin" mode={mode} savedVersion={savedVersion}/>}
  </main>;
}
