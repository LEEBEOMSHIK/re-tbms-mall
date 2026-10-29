'use client';
import {stockMatches,type StockFilter} from '@/lib/inventory-overview';
import {KeyFacts} from '@/components/ui/key-facts';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import {ProgressBadge} from '@/components/product-progress';
import {parseAdminFactoryWorkspace,type AdminFactoryWorkspace} from '@/lib/factory';
import {useListPagination} from '@/components/ui/list-pagination';
import {inventoryPageSizes,pageRange,pageButtons} from '@/lib/pagination';
import { inventorySummary, inventoryMatches, productStockSummary } from '@/lib/inventory-summary';
import { StatusBadge } from '@/components/ui/status-badge';
import { FormLabel, FormSelect } from '@/components/ui/form-controls';
import { Tooltip } from '@/components/ui/tooltip';
import { catalogRequest, movementReasonLabels, categoryPath, parseProductDeletion, type Movement, type Catalog, type CatalogFailure, type ProductDraft, type ProductReadiness } from '@/lib/catalog';

function ActionIcon({ action }: { action: 'edit' | 'options' | 'stock' | 'delete' }) {
  return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    {action === 'edit' ? <path d="m12.5 3 4.5 4.5M3 17l1-5L13 3a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2l-9 9-5 1Z" />
      : action === 'stock' ? <path d="M3 6 10 2l7 4v9l-7 3-7-3V6Zm0 0 7 4 7-4M10 10v8" />
      : action === 'options' ? <path d="M3 4h14M3 10h14M3 16h14M7 2v4M13 8v4M7 14v4" />
        : <path d="M3 5h14M7 5V3h6v2M5 5l1 12h8l1-12M8 8v6M12 8v6" />}
  </svg>;
}

function ProductRowActions({ product, busy, onDelete }: { product: ProductDraft; busy: boolean; onDelete: (trigger: HTMLButtonElement) => void }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => panel.current?.hidePopover();
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, []);
  function toggle() {
    const element = panel.current, button = trigger.current;
    if (!element || !button) return;
    if (element.matches(':popover-open')) { element.hidePopover(); return; }
    element.showPopover();
    const anchor = button.getBoundingClientRect(), box = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(anchor.right - box.width, window.innerWidth - box.width - 8))}px`;
    element.style.top = `${Math.max(8, anchor.bottom + box.height + 8 <= window.innerHeight ? anchor.bottom + 8 : anchor.top - box.height - 8)}px`;
  }
  return <div className="catalog-product-actions">
    <Link className="catalog-row-action" href={`/admin/catalog/${product.id}/edit`} aria-label={`${product.name} 수정`}><ActionIcon action="edit" />수정</Link>
    <button ref={trigger} type="button" className="catalog-row-action" aria-label={`${product.name} 관리 더보기`} aria-expanded={open} aria-controls={id} onClick={toggle}>더보기<span aria-hidden="true">⋯</span></button>
    <div ref={panel} id={id} popover="auto" className="catalog-actions-popover" role="group" aria-label={`${product.name} 추가 관리`} onToggle={event => setOpen(event.newState === 'open')}>
      <Link href={`/admin/catalog/${product.id}/publication/edit`}>고객 화면 공개 설정</Link>
      <Link href={`/admin/catalog/options/new?product_id=${encodeURIComponent(product.id)}`} aria-label={`${product.name} 색상·사이즈 등록`}><ActionIcon action="options" />색상·사이즈 등록</Link>
      <button type="button" className="catalog-actions-danger" disabled={busy} aria-label={`${product.name} 삭제`} onClick={() => { panel.current?.hidePopover(); if (trigger.current) onDelete(trigger.current); }}><ActionIcon action="delete" />상품 삭제</button>
    </div>
  </div>;
}

const deletionErrors: Record<CatalogFailure, string> = {
  auth: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  conflict: '상품 정보가 변경되었거나 연결된 색상·사이즈가 있어 삭제하지 못했습니다. 최신 목록을 확인해 주세요.',
  missing: '상품을 찾을 수 없습니다. 최신 목록에서 삭제 여부를 확인해 주세요.',
  validation: '삭제 요청을 확인하지 못했습니다. 최신 상품 정보를 다시 불러와 주세요.',
  unavailable: '삭제 결과를 확인할 수 없습니다. 다시 삭제하지 말고 최신 목록에서 처리 여부를 먼저 확인해 주세요.',
};

const readinessLabels: Record<ProductReadiness['status'], string> = {
  no_options: '색상·사이즈 등록 필요',
  no_stock: '재고 입고 필요',
  partial_stock: '일부 옵션 재고 없음',
  in_stock: '재고 준비됨',
};

function ProductPublicationCell({product}:{product:ProductDraft}) {
 const state=product.publication_status;
 const label=state==='published'?(product.publication_visible?'게시 중':'고객 화면 제외'):state==='paused'?'게시 중지':state==='draft'?'준비 중':'상태 확인 필요';
 const reasons=product.publication_reasons||[];
 return <td className="catalog-publication-cell"><Tooltip label={`${product.name} 게시 상태 상세`} trigger={<span className="catalog-publication-trigger-content"><StatusBadge kind={state==='published'&&product.publication_visible?'stock_healthy':'unpublished'}>{label}</StatusBadge><span className="catalog-publication-reason">{reasons[0]||(product.publication_can_publish?'게시 조건 충족':'공개 설정 확인')}</span></span>}><strong>{product.name} · {label}</strong>{reasons.map(reason=><p key={reason}>{reason}</p>)}</Tooltip></td>;
}

export function CatalogList({ catalog, refresh }: { catalog: Catalog; refresh: () => Promise<Catalog | null> }) {
  const [factoryData,setFactoryData]=useState<AdminFactoryWorkspace|null>(null),[factoryError,setFactoryError]=useState(false);
  useEffect(()=>{let active=true;void catalogRequest('/api/admin/factory-workspace',parseAdminFactoryWorkspace).then(r=>{if(!active)return;if(r.ok){setFactoryData(r.data);setFactoryError(false)}else setFactoryError(true)});return()=>{active=false}},[catalog]);
  const [target, setTarget] = useState<ProductDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);
  const [notice, setNotice] = useState('');
  const [removed, setRemoved] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);
  const focusList = useRef(false);
  const confirmed = useRef(new Set<string>());
  const unresolved = useRef(new Map<string, CatalogFailure>());
  const products = catalog.products.filter(product => !removed.includes(product.id));
  const productPages=useListPagination(products,'products','상품');
  const linked = !!target && catalog.skus.some(option => option.product_id === target.id);

  useEffect(() => {
    if (!target) return;
    if (!dialog.current?.open) dialog.current?.showModal();
    cancel.current?.focus();
  }, [target]);

  async function confirmDelete() {
    if (!target || lock.current || linked || failure || confirmed.current.has(target.id)) return;
    lock.current = true;
    setBusy(true);
    dialog.current?.focus();
    const deleting = target;
    try {
      const result = await catalogRequest(`/api/admin/products/${deleting.id}`, parseProductDeletion, { method: 'DELETE', body: { version: deleting.version } });
      if (!result.ok || result.data.id !== deleting.id) {
        const reason = result.ok ? 'unavailable' : result.reason;
        unresolved.current.set(deleting.id, reason);
        setFailure(reason);
        return;
      }
      confirmed.current.add(deleting.id);
      unresolved.current.delete(deleting.id);
      setRemoved(current => [...current, deleting.id]);
      setNotice(`${deleting.name} 상품을 삭제했습니다.`);
      focusList.current = true;
      dialog.current?.close();
      const updated = await refresh();
      if (!updated) setNotice(`${deleting.name} 상품 삭제는 완료되었습니다. 목록 갱신에 실패했으므로 목록 새로고침으로 확인해 주세요.`);
    } finally { lock.current = false; setBusy(false); }
  }

  async function reviewLatest() {
    if (!target || lock.current) return;
    lock.current = true;
    setBusy(true);
    dialog.current?.focus();
    try {
      const updated = await refresh();
      if (!updated) { setFailure('unavailable'); return; }
      const latest = updated.products.find(product => product.id === target.id);
      unresolved.current.delete(target.id);
      if (!latest) {
        setNotice('최신 목록에 해당 상품이 없습니다. 현재 목록을 확인해 주세요.');
        focusList.current = true;
        dialog.current?.close();
      } else {
        setTarget(latest);
        setFailure(null);
      }
    } finally { lock.current = false; setBusy(false); }
  }

  return (
    <>
      <div aria-live="polite">{notice && <p className="catalog-notice">{notice}</p>}</div>
      <div className="catalog-list-totals" aria-label="등록 상품 요약"><span>상품 <strong>{products.length}개</strong></span><span>색상·사이즈 <strong>{catalog.skus.length}개</strong></span><span>보유 재고 <strong>{catalog.skus.reduce((sum,sku)=>sum+sku.on_hand,0).toLocaleString('ko-KR')}개</strong></span></div>
      <section className="catalog-panel">
        <h2 ref={heading} tabIndex={-1}>등록 상품</h2>
        <p className="catalog-note catalog-readiness-note">준비 상태는 현재 재고 기준입니다. 재고 준비가 판매 가능이나 고객 화면 자동 게시를 의미하지 않습니다.</p>
        {productPages.summary}
        {!products.length ? <p>등록한 상품이 없습니다. <Link href="/admin/catalog/new">첫 상품을 등록해 주세요.</Link></p> : (
          <div className="catalog-table-scroll" tabIndex={0} role="region" aria-label="등록 상품 목록">
            <table className="catalog-products-table">
              <thead><tr><th scope="col">상품</th><th scope="col">카테고리 · 계절</th><th scope="col">담당 공장</th><th scope="col">재고</th><th scope="col">게시 상태</th><th scope="col">관리</th></tr></thead>
              <tbody>{productPages.items.map(product => (
                <tr className="catalog-product-row" data-product-id={product.id} key={product.id}>
                  <td className="catalog-product-identity"><Link className="catalog-product-name-link" href={`/admin/catalog/${encodeURIComponent(product.id)}`} aria-label={`${product.name} 상품 상세`}>{product.name}</Link><small>{product.internal_name}</small></td>
                  <td>{categoryPath(catalog.categories, product.category_id)}{catalog.categories.some(category => category.id === product.category_id && (!category.is_active || (category.parent_id !== null && !catalog.categories.find(parent => parent.id === category.parent_id)?.is_active))) && <small>사용 중지</small>}<small>{product.seasons.length ? product.seasons.map(code => catalog.season_options.find(season => season.code === code)?.label).join(' · ') : '계절 미지정'}</small></td>
                  <td>{factoryError?<span>공장 상태 조회 실패</span>:!factoryData?<span>확인 중…</span>:factoryData.assignments.some(a=>a.product_id===product.id)?<><strong>{catalog.suppliers?.find(s=>s.id===factoryData.assignments.find(a=>a.product_id===product.id)?.supplier_id)?.name||'공장 정보 없음'}</strong><div className="catalog-factory-progress"><ProgressBadge status={factoryData.assignments.find(a=>a.product_id===product.id)!.progress_status}/></div></>:<span>공장 미배정</span>}</td>
                  <td className="catalog-product-stock"><strong>{productStockSummary(catalog,product.id).onHand.toLocaleString('ko-KR')}개</strong><small>옵션 {productStockSummary(catalog,product.id).count}개 · {catalog.product_readiness?.find(item=>item.product_id===product.id)?readinessLabels[catalog.product_readiness.find(item=>item.product_id===product.id)!.status]:'상태 확인 필요'}</small><Link className="catalog-row-action" href={`/admin/catalog/inventory?product_id=${encodeURIComponent(product.id)}`} aria-label={`${product.name} 재고 보기`}><ActionIcon action="stock" />재고 보기</Link></td>
                  <ProductPublicationCell product={product} />
                  <td className="catalog-product-actions-cell"><ProductRowActions product={product} busy={busy} onDelete={button => {
                    trigger.current = button;
                    setFailure(unresolved.current.get(product.id) || null);
                    setTarget(product);
                  }} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {productPages.navigation}
      </section>
      <dialog ref={dialog} className="catalog-delete-dialog" aria-labelledby="catalog-delete-title" aria-describedby="catalog-delete-description" tabIndex={-1}
        onClose={() => {
          setTarget(null);
          if (focusList.current || !trigger.current?.isConnected) heading.current?.focus();
          else trigger.current.focus();
          focusList.current = false;
        }}
        onCancel={event => { if (lock.current) event.preventDefault(); }}
        onKeyDown={event => {
          if (event.key !== 'Tab') return;
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'));
          const first = items[0], last = items.at(-1);
          if (!first) { event.preventDefault(); event.currentTarget.focus(); }
          else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first.focus(); }
        }}
        onClick={event => {
          if (lock.current || event.target !== event.currentTarget) return;
          const box = event.currentTarget.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.currentTarget.close();
        }}>
        <h2 id="catalog-delete-title">상품 삭제</h2>
        {target && <dl className="catalog-delete-identity"><div><dt>고객 표시명</dt><dd>{target.name}</dd></div><div><dt>내부 관리명</dt><dd>{target.internal_name}</dd></div></dl>}
        <p id="catalog-delete-description">삭제한 상품을 되돌리는 화면은 제공되지 않습니다. 연결된 색상·사이즈가 하나라도 있으면 재고가 0개여도 삭제할 수 없습니다.</p>
        {linked && <p className="catalog-delete-blocked">이 상품에는 등록된 색상·사이즈가 있어 삭제할 수 없습니다.</p>}
        {failure && <div role="alert" className="admin-session-error">{deletionErrors[failure]} {failure === 'auth' && <Link href="/admin/login">관리자 로그인</Link>}</div>}
        <div className="catalog-delete-actions">
          <button ref={cancel} type="button" disabled={busy} onClick={() => dialog.current?.close()}>취소</button>
          {failure && failure !== 'auth' && <button type="button" disabled={busy} onClick={() => void reviewLatest()}>최신 목록 확인</button>}
          <button className="catalog-confirm-delete" type="button" disabled={busy || linked || !!failure} onClick={() => void confirmDelete()}>{busy ? '처리 중…' : '상품 삭제'}</button>
        </div>
      </dialog>
    </>
  );
}

export function MovementHistory({ catalog, savedMovement, missingSaved = false, productScoped = false, initialStockFilter = 'all' }: { catalog: Catalog; savedMovement?: Movement; missingSaved?: boolean; productScoped?: boolean; initialStockFilter?: StockFilter }) {
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const [view, setView] = useState('stock');
  const [stockFilter,setStockFilter]=useState<StockFilter>(initialStockFilter);
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [pageSize,setPageSize]=useState(20);
  const [pagination,setPagination]=useState({key:'',page:1});
  const pageStatus=useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (savedMovement) { resultHeading.current?.focus(); resultHeading.current?.scrollIntoView({ block: 'start' }); } }, [savedMovement]);
  const rows = inventorySummary(catalog);
  const visibleRows = rows.filter(row => inventoryMatches(row, query) && (view!=='stock'||stockMatches(row.low,stockFilter)));
  const matchedIds = new Set(visibleRows.map(row => row.sku.id));
  const reasonAllowed = (code: string) => view === 'receipt' ? code === 'receipt' : view === 'out' ? ['sale', 'gift', 'disposal', 'other_out'].includes(code) : ['adjust_in', 'adjust_out', 'legacy'].includes(code);
  const supplierOptions = [...new Map(catalog.movements.filter(item => item.reason_code === 'receipt' && item.supplier_id).map(item => [item.supplier_id!, item.supplier_name || '입고처 미기록'])).entries()].map(([value, label]) => ({ value, label }));
  const movements = catalog.movements.filter(movement => (view !== 'receipt' || supplierFilter === 'all' || (movement.supplier_id || 'missing') === supplierFilter) && matchedIds.has(movement.sku_id) && reasonAllowed(movement.reason_code || 'legacy') && (reasonFilter === 'all' || (movement.reason_code || 'legacy') === reasonFilter));
  const sums = rows.reduce((sum, row) => ({ current: sum.current + row.current, received: sum.received + row.received, out: sum.out + row.sold + row.otherOut }), { current: 0, received: 0, out: 0 });
  const adjustmentCount = catalog.movements.filter(movement => ['adjust_in', 'adjust_out', 'legacy'].includes(movement.reason_code || 'legacy')).length;
  const movementTotal = movements.reduce((sum, movement) => sum + movement.delta, 0);
  const paginationKey=JSON.stringify([view,query,stockFilter,reasonFilter,supplierFilter,pageSize,productScoped?catalog.products[0]?.id:'all']);
  const range=pageRange(view==='stock'?visibleRows.length:movements.length,pagination.key===paginationKey?pagination.page:1,pageSize);
  // Persist a reset/clamp, so returning to an earlier filter cannot resurrect its old page.
  if(pagination.key!==paginationKey || pagination.page!==range.page)setPagination({key:paginationKey,page:range.page});
  const pageRows=visibleRows.slice(range.start,range.end);
  const pageMovements=movements.slice(range.start,range.end);
  function goToPage(page:number){setPagination({key:paginationKey,page});pageStatus.current?.focus();pageStatus.current?.scrollIntoView({block:'center'});}
  const savedRow = savedMovement ? rows.find(row => row.sku.id === savedMovement.sku_id) : undefined;
  const title = view === 'stock' ? '현재 보유 재고' : view === 'receipt' ? '입고 내역' : view === 'out' ? '출고 내역' : '조정·기존 기록';
  return <section id="movement-history" className="catalog-panel">
      {savedMovement && <section className="catalog-notice" aria-label="저장된 재고 기록">
        <h2 ref={resultHeading} tabIndex={-1}>재고 변경이 기록되었습니다</h2>
        <p>상품: {savedRow?.product?.name || '상품 정보 없음'} · {savedRow?.sku.color} / {savedRow?.sku.size}</p>
        <p>옵션 관리 코드: {savedRow?.sku.code || '확인 불가'}</p>
        {savedMovement.reason_code === 'receipt' && <p>입고처: {savedMovement.supplier_name || '입고처 미기록'}</p>}
        <KeyFacts label="확정 재고 변경" items={[{label:movementReasonLabels[savedMovement.reason_code||'legacy'],value:`${savedMovement.delta>0?'+':''}${savedMovement.delta}개`},{label:'실제 재고',previous:`${savedMovement.balance_after-savedMovement.delta}개`,value:`${savedMovement.balance_after}개`}]}/>
        {savedMovement.reason && <p>상세 사유: {savedMovement.reason}</p>}
      </section>}
      {missingSaved && <p role="status">요청한 기록을 현재 목록에서 확인할 수 없습니다. 목록을 다시 조회해 주세요.</p>}

    <div className="catalog-inventory-totals" role="group" aria-label={`${productScoped?'선택 상품':'전체'} 재고 요약 및 보기 선택`}>
      {[
        {value:'stock',label:'현재 보유 재고',total:`${sums.current}개`},
        {value:'receipt',label:'입고 기록 누계',total:`${sums.received}개`},
        {value:'out',label:'판매·기타 출고 누계',total:`${sums.out}개`},
        {value:'adjust',label:'조정·기존 기록',total:`${adjustmentCount}건`},
      ].map(card=><button type="button" key={card.value} aria-pressed={view===card.value} aria-controls="inventory-view-content" onClick={()=>{setView(card.value);setStockFilter('all');setReasonFilter('all');setSupplierFilter('all');}}>
        <span>{card.label}</span><strong>{card.total}</strong><span className="catalog-inventory-card-action">{view===card.value?'✓ 현재 보는 항목':card.value==='stock'?'재고 보기 →':'내역 보기 →'}</span>
      </button>)}
    </div>
    <p className="catalog-note catalog-inventory-summary-note">요약카드는 {productScoped?'선택 상품':'전체 상품'}의 전체 기록 기준이며 검색 조건에 따라 바뀌지 않습니다.</p>
    <div id="inventory-view-content" className="catalog-inventory-view">
    <header className="catalog-inventory-list-heading"><h2 aria-live="polite">{title}</h2><Tooltip label={`${title} 조회 기준 도움말`} trigger={<span className="catalog-help-icon" aria-hidden="true">?</span>}>
      <p>현재 재고는 시스템에 저장된 수량입니다. 입고 누계에는 옵션 등록 시 초기 입고가 포함됩니다. 기존 미분류 기록은 입고·출고로 추정하지 않습니다.</p>
      {view !== 'stock' && <p>{view === 'receipt' ? '공장·공급처 등에서 들어온 상품과 수량입니다. 입고처는 기록 당시 이름이며 연결되지 않은 기록은 입고처 미기록으로 표시합니다.' : view === 'out' ? '판매·증정·폐기·기타 출고 수량입니다. 실제 고객·배송·주문·결제 정보는 연결되지 않았습니다.' : '조정과 기존 미분류 기록입니다. 기존 기록의 입고·출고 유형을 임의로 추정하지 않습니다.'} 시각은 한국 시간 기준입니다.</p>}
    </Tooltip></header>
    <div className="ds-form catalog-inventory-filters" data-view={view} role="group" aria-label={`${title} 검색 조건`}>
      <div className="catalog-inventory-filter-field catalog-inventory-search"><FormLabel htmlFor="inventory-search">상품·옵션 검색</FormLabel><input id="inventory-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="상품명, 내부명, 색상, 사이즈, 코드" /></div>
      {view === 'stock' && <div className="catalog-inventory-filter-field"><FormLabel htmlFor="stock-status-filter">부족 상태</FormLabel><FormSelect id="stock-status-filter" value={stockFilter} onChange={value=>setStockFilter(value as StockFilter)} options={[{value:'all',label:'전체 옵션'},{value:'low',label:'부족 옵션만'},...(stockFilter==='invalid'?[{value:'invalid',label:'잘못된 조회 조건'}]:[])]}/></div>}
      {view !== 'stock' && <div className="catalog-inventory-filter-field"><FormLabel htmlFor="movement-filter">사유별 조회</FormLabel><FormSelect id="movement-filter" value={reasonFilter} onChange={setReasonFilter} options={[{ value: 'all', label: '전체' }, ...Object.entries(movementReasonLabels).filter(([code]) => reasonAllowed(code)).map(([value, label]) => ({ value, label }))]} /></div>}
      {view === 'receipt' && <div className="catalog-inventory-filter-field"><FormLabel htmlFor="supplier-filter">입고처별 조회</FormLabel><FormSelect id="supplier-filter" value={supplierFilter} onChange={setSupplierFilter} options={[{ value: 'all', label: '전체 입고처' }, { value: 'missing', label: '입고처 미기록' }, ...supplierOptions]} /></div>}
    </div>
    <div className="catalog-pagination-summary">
      <p ref={pageStatus} tabIndex={-1} aria-live="polite">총 {range.total}건 중 {range.total?range.start+1:0}–{range.end}건 표시 · {range.pages?range.page:0} / {range.pages}페이지</p>
      <div className="ds-form catalog-page-size"><FormLabel htmlFor="inventory-page-size">페이지당 표시</FormLabel><FormSelect id="inventory-page-size" value={String(pageSize)} onChange={value=>setPageSize(Number(value))} options={inventoryPageSizes.map(size=>({value:String(size),label:`${size}개씩`}))}/></div>
    </div>
    {view === 'stock' ? <div className="catalog-inventory-results">
      <p aria-live="polite">전체 {rows.length}개 옵션 중 {visibleRows.length}개</p>
      {!visibleRows.length ? <p className="catalog-empty-state">표시할 재고가 없습니다.</p> : <div className="catalog-table-scroll" tabIndex={0} role="region" aria-label="현재 보유 재고 목록"><table>
        <thead><tr><th>상품명 / 내부 관리명</th><th>색상 / 사이즈</th><th>현재 재고</th><th>부족 상태 · 관리</th><th>입출고 누계</th></tr></thead>
        <tbody>{pageRows.map(row => <tr key={row.sku.id} data-stock-sku-id={row.sku.id}><td>{row.product ? <Link className="catalog-product-name-link" href={`/admin/catalog/${encodeURIComponent(row.product.id)}`} aria-label={`${row.product.name} 상품 상세`}>{row.product.name}</Link> : '상품 정보 없음'}<small>{row.product?.internal_name}</small></td><td>{row.sku.color} / {row.sku.size}<small>{row.sku.code}</small><span className={`sku-usage-badge ${row.sku.is_active?'is-active':'is-inactive'}`}>{row.sku.is_active?'사용 중':'사용 안 함'}</span></td><td><strong className="catalog-table-key-value">{row.current}개</strong></td><td><StatusBadge kind={row.low ? 'low_stock' : 'stock_healthy'}>{row.low ? '부족' : '양호'}</StatusBadge><small>기준 {row.sku.reorder_point}개 이하일 때 표시</small><Link className="catalog-row-action" href={`/admin/catalog/options/${encodeURIComponent(row.sku.id)}/edit`} aria-label={`${row.product?.name||row.sku.code} ${row.sku.color} ${row.sku.size} 옵션 수정`}>옵션 수정</Link></td><td><details className="catalog-list-details"><summary aria-label={`${row.product?.name||row.sku.code} ${row.sku.color} ${row.sku.size} 입출고 누계`}>누계 보기</summary><dl><div><dt>입고</dt><dd>{row.received}개</dd></div><div><dt>판매 출고</dt><dd>{row.sold}개</dd></div><div><dt>기타 출고</dt><dd>{row.otherOut}개</dd></div><div><dt>조정 순증</dt><dd>{row.adjusted>0?'+':''}{row.adjusted}개</dd></div></dl></details></td></tr>)}</tbody>
      </table></div>}
    </div> : <div className="catalog-inventory-results">
      <p aria-live="polite">조회 결과 {movements.length}건 · {view === 'receipt' ? `입고 수량 합계 ${movementTotal}개` : view === 'out' ? `출고 수량 합계 ${Math.abs(movementTotal)}개` : `변동 합계 ${movementTotal > 0 ? '+' : ''}${movementTotal}개 (미분류 포함)`}</p>
      {!movements.length ? <p className="catalog-empty-state">표시할 기록이 없습니다.</p> : <div className="catalog-table-scroll" tabIndex={0} role="region" aria-label={`${title} 목록`}><table>
        <thead><tr><th>기록 시각</th><th>상품 · 옵션</th>{view === 'receipt' && <th>입고처</th>}<th>{view === 'receipt' ? '입고 / 변경 후' : view === 'out' ? '출고 / 변경 후' : '변경량 / 변경 후'}</th><th>처리 사유</th><th>기록 상세</th></tr></thead>
        <tbody>{pageMovements.map(movement => { const row = rows.find(item => item.sku.id === movement.sku_id); return <tr key={movement.id} data-movement-id={movement.id}>
          <td>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(movement.created_at))}</td><td>{row?.product ? <Link className="catalog-product-name-link" href={`/admin/catalog/${encodeURIComponent(row.product.id)}`} aria-label={`${row.product.name} 상품 상세`}>{row.product.name}</Link> : '상품 정보 없음'}<small>{row?.sku.color} / {row?.sku.size}</small></td>{view === 'receipt' && <td>{movement.supplier_name || '입고처 미기록'}</td>}<td><strong className="catalog-table-key-value">{view === 'out' ? Math.abs(movement.delta) : movement.delta}개</strong><small>변경 후 <strong>{movement.balance_after}개</strong></small></td><td>{movementReasonLabels[movement.reason_code || 'legacy']}</td><td><details className="catalog-list-details"><summary aria-label={`${row?.product?.name||'상품'} ${movementReasonLabels[movement.reason_code||'legacy']} 기록 상세`}>상세 보기</summary><dl><div><dt>내부 관리명</dt><dd>{row?.product?.internal_name||'확인 불가'}</dd></div><div><dt>옵션 코드</dt><dd>{row?.sku.code||'확인 불가'}</dd></div><div><dt>상세 사유</dt><dd>{movement.reason||'없음'}</dd></div><div><dt>기록자</dt><dd>{movement.actor==='local-admin'?'공용 로컬 관리자':movement.actor}</dd></div></dl></details></td>
        </tr>; })}</tbody>
      </table></div>}
    </div>}
    <nav className="catalog-pagination" aria-label={`${title} 페이지 이동`}>
      <button type="button" disabled={range.page<=1||!range.pages} onClick={()=>goToPage(range.page-1)}>이전</button>
      {pageButtons(range.page,range.pages).map((page,index)=>page==='gap'?<span key={`gap-${index}`} aria-hidden="true">…</span>:<button type="button" key={page} aria-label={`${page}페이지`} aria-current={page===range.page?'page':undefined} onClick={()=>goToPage(page)}>{page}</button>)}
      <button type="button" disabled={!range.pages||range.page>=range.pages} onClick={()=>goToPage(range.page+1)}>다음</button>
    </nav>
    </div>

  </section>;
}




