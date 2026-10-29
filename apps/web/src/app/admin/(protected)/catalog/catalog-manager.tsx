'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type {StockFilter} from '@/lib/inventory-overview';
import {scopeInventoryCatalog} from '@/lib/inventory-summary';
import { catalogRequest, parseCatalog, type Catalog, type CatalogFailure } from '@/lib/catalog';
import { CatalogList, MovementHistory } from './catalog-list';
import { ProductForm, OptionForm, InventoryForm } from './catalog-forms';
import {ProductDetail} from './product-detail';
import { CategoryManager } from './category-manager';
import { OptionValueManager } from './option-value-manager';
import './catalog.css';

type Mode = 'list' | 'product' | 'detail' | 'edit' | 'options' | 'inventory' | 'inventory-new' | 'categories' | 'category-new' | 'category-edit' | 'option-values' | 'option-value-new' | 'option-value-edit';
const titles: Record<Mode, string> = {
  list: '상품 목록', product: '상품 등록', detail: '상품 상세', edit: '상품 수정',
  options: '색상·사이즈 등록', inventory: '재고 현황·입출고 내역', 'inventory-new': '재고 입고·출고·조정', categories: '카테고리 관리',
  'option-values': '색상·사이즈 기준정보', 'category-new': '카테고리 등록', 'category-edit': '카테고리 수정', 'option-value-new': '색상·사이즈 기준정보 등록', 'option-value-edit': '색상·사이즈 기준정보 수정',
};

export function CatalogManager({ mode = 'list', productId = '', entityId = '', categoryKind = 'root', optionKind = 'color', savedMovementId = '', savedImageId = '', inventoryFlow = '', stockFilter = 'all' }: { mode?: Mode; productId?: string; entityId?: string; categoryKind?: 'root'|'child'; optionKind?: 'color'|'size'; savedMovementId?: string; savedImageId?: string; inventoryFlow?: string; stockFilter?: StockFilter }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);
  const pendingRefresh = useRef<Promise<Catalog | null> | null>(null);


  const refresh = useCallback((): Promise<Catalog | null> => {
    if (pendingRefresh.current) return pendingRefresh.current;

    const request = catalogRequest('/api/admin/catalog', parseCatalog).then(result => {
      if (result.ok) { setCatalog(result.data); setFailure(null); return result.data; }
      setFailure(result.reason);
      return null;
    }).finally(() => { pendingRefresh.current = null; });
    pendingRefresh.current = request;
    return request;
  }, []);
  const refreshAfterChange = useCallback(async () => {
    if (pendingRefresh.current) await pendingRefresh.current;
    return refresh();
  }, [refresh]);

  useEffect(() => {
    let active = true;
    void refresh().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  useEffect(() => {
    if (!['options','option-values','option-value-new','option-value-edit'].includes(mode)) return;
    let returning: Promise<Catalog | null> | null = null;
    const onReturn = () => {
      if (document.visibilityState !== 'visible' || returning) return;
      returning = refreshAfterChange().finally(() => { returning = null; });
    };
    window.addEventListener('focus', onReturn);
    window.addEventListener('pageshow', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.removeEventListener('focus', onReturn);
      window.removeEventListener('pageshow', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [mode, refreshAfterChange]);

  const product = catalog?.products.find(item => item.id === productId);
  const inventoryCatalog = catalog ? scopeInventoryCatalog(catalog,productId) : null;
  const allInventoryHref = '/admin/catalog/inventory' + (savedMovementId ? `?saved=${encodeURIComponent(savedMovementId)}` : '');
  const isInventory = mode === 'inventory' || mode === 'inventory-new';
  return (
    <main id="main" className="catalog-manager">
      <header className="catalog-heading">
        <div><p className="eyebrow">{isInventory ? '재고 관리' : '상품 관리'}</p><h1>{titles[mode]}</h1><p>{isInventory ? '입고부터 출고까지 재고 변동을 기록하고 확인합니다.' : '등록 상품과 고객 화면 공개 설정을 관리합니다.'}</p></div>
        {productId && ['edit','options','inventory-new'].includes(mode) ? <Link className="catalog-link-button" href={`/admin/catalog/${encodeURIComponent(productId)}`}>상품 상세로</Link> : mode === 'category-new' || mode === 'category-edit' ? <Link className="catalog-link-button" href="/admin/catalog/categories">카테고리 목록으로</Link> : mode === 'option-value-new' || mode === 'option-value-edit' ? <Link className="catalog-link-button" href="/admin/catalog/option-values">기준정보 목록으로</Link> : mode === 'inventory-new' ? <Link className="catalog-link-button" href="/admin/catalog/inventory">재고 변경 이력으로</Link> : mode !== 'list' && mode !== 'inventory' && <Link className="catalog-link-button" href="/admin/catalog">상품 목록으로</Link>}
      </header>
      {!isInventory && <p className="catalog-note catalog-scope">상품 상세의 공개 설정에서 게시한 상품만 고객 쇼핑 화면에 표시됩니다. 색상·사이즈 옵션은 상품 관리에서, 입고·출고 내역은 재고 관리에서 확인합니다.</p>}
      {mode === 'list' && (
        <nav className="catalog-actions catalog-toolbar" aria-label="상품 관리 작업">
          <Link className="catalog-link-button catalog-primary" href="/admin/catalog/new">상품 등록</Link>
          <Link className="catalog-link-button" href="/admin/catalog/options/new">색상·사이즈 등록</Link>
          <Link className="catalog-link-button" href="/admin/catalog/categories">카테고리 관리</Link>
          <Link className="catalog-link-button" href="/admin/catalog/option-values">색상·사이즈 기준정보</Link>
          <button disabled={loading} onClick={() => void refresh()}>목록 새로고침</button>
        </nav>
      )}
      {mode === 'inventory' && <nav className="catalog-actions catalog-toolbar catalog-inventory-toolbar" aria-label="재고 관리 작업">
        <Link className="catalog-link-button catalog-primary" href="/admin/shipments">발송 수령·검수</Link>
        <Link className="catalog-link-button" href="/admin/catalog/inventory/new?flow=receipt">기타 입고 등록</Link>
        <Link className="catalog-link-button" href="/admin/catalog/inventory/new?flow=out">출고 등록</Link>
        <Link className="catalog-link-button" href="/admin/catalog/inventory/new?flow=adjust">재고 조정</Link>
        <Link className="catalog-link-button" href="/admin/catalog/suppliers">공장·공급처 관리</Link>
        <button disabled={loading} onClick={() => void refresh()}>재고·내역 새로고침</button>
      </nav>}
      {loading && <p role="status">목록을 불러오는 중입니다.</p>}
      {failure && (
        <div role="alert" className="admin-session-error">
          {failure === 'auth' ? <>로그인이 만료되었습니다. <Link href="/admin/login">다시 로그인</Link>해 주세요.</> : '목록을 불러오지 못했습니다. 서버 상태를 확인해 주세요.'}
          <button onClick={() => void refresh()}>목록 다시 불러오기</button>
        </div>
      )}
      {catalog && <>
        {mode === 'list' && <CatalogList catalog={catalog} refresh={refreshAfterChange} />}
        {mode === 'detail' && (product ? <ProductDetail catalog={catalog} product={product} savedImageId={savedImageId}/> : <p role="alert">상품을 찾을 수 없습니다. 삭제되었거나 잘못된 주소일 수 있습니다. 상품 목록에서 다시 선택해 주세요.</p>)}
        {mode === 'product' && <ProductForm categories={catalog.categories} seasonOptions={catalog.season_options} refresh={refreshAfterChange} />}
        {mode === 'edit' && (product
          ? <ProductForm key={productId} initial={product} categories={catalog.categories} seasonOptions={catalog.season_options} refresh={refreshAfterChange} />
          : <p role="alert">상품을 찾을 수 없습니다. 상품 목록에서 다시 선택해 주세요.</p>)}
        {mode === 'options' && <OptionForm key={productId} catalog={catalog} productId={productId} refresh={refreshAfterChange} />}
        {mode === 'inventory' && inventoryCatalog && <>
          {productId && <section className="catalog-inventory-product-scope" aria-label="재고 조회 상품"><div>{product ? <><strong>{product.name}</strong><p className="catalog-note">{product.internal_name} · 이 상품의 재고와 입출고 기록만 표시합니다.</p></> : <p role="alert">선택한 상품을 찾을 수 없습니다. 다른 상품의 재고를 대신 표시하지 않습니다.</p>}</div><Link className="catalog-link-button" href={allInventoryHref}>전체 재고 보기</Link></section>}
          {(!productId || product) && <MovementHistory key={`${productId}:${stockFilter}`} initialStockFilter={stockFilter} catalog={inventoryCatalog} productScoped={!!productId} savedMovement={!failure ? inventoryCatalog.movements.find(item => item.id === savedMovementId) : undefined} missingSaved={!failure && !!savedMovementId && !inventoryCatalog.movements.some(item => item.id === savedMovementId)} />}
        </>}
        {mode === 'inventory-new' && <InventoryForm productId={productId} key={inventoryFlow + productId} catalog={catalog} refresh={refreshAfterChange} initialFlow={inventoryFlow} />}
        {['categories','category-new','category-edit'].includes(mode) && <CategoryManager key={mode + entityId + categoryKind} catalog={catalog} refresh={refreshAfterChange} mode={mode === 'categories' ? 'list' : mode === 'category-new' ? 'new' : 'edit'} categoryId={entityId} categoryKind={categoryKind} />}
        {['option-values','option-value-new','option-value-edit'].includes(mode) && <OptionValueManager key={mode + entityId + optionKind} catalog={catalog} refresh={refreshAfterChange} mode={mode === 'option-values' ? 'list' : mode === 'option-value-new' ? 'new' : 'edit'} valueId={entityId} initialKind={optionKind} />}
      </>}
    </main>
  );
}









