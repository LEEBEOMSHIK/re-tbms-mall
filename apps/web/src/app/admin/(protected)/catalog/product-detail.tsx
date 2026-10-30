import {ProductForm} from './catalog-forms';
import {PublicationEditor} from './publication-editor';
import {KeyFacts} from '@/components/ui/key-facts';
import {useListPagination} from '@/components/ui/list-pagination';
import {StatusBadge} from '@/components/ui/status-badge';
import {Tooltip} from '@/components/ui/tooltip';
import {ProductFactorySummary} from '../factories/factory-admin';
import Link from 'next/link';
import {ColorChip} from '@/components/ui/color-chip';
import {ProductImages} from './product-images';
import {type Catalog, type ProductDraft} from '@/lib/catalog';
import {productStockSummary} from '@/lib/inventory-summary';
import {useSyncExternalStore, type KeyboardEvent} from 'react';
import {AdminReviewList} from '../reviews/review-pages';

const detailTabs = [
  {id:'product-basic',label:'기본정보'},
  {id:'product-pricing',label:'가격·할인'},
  {id:'product-options',label:'색상·사이즈'},
  {id:'product-stock',label:'재고'},
  {id:'product-reviews',label:'리뷰 관리'},
] as const;
type DetailTab = typeof detailTabs[number]['id'];
function currentTab(): DetailTab {
  return detailTabs.find(tab=>`#${tab.id}`===window.location.hash)?.id ?? 'product-basic';
}
function subscribeTab(onChange:()=>void) {
  window.addEventListener('hashchange',onChange);
  window.addEventListener('popstate',onChange);
  return ()=>{window.removeEventListener('hashchange',onChange);window.removeEventListener('popstate',onChange);};
}

export function ProductDetail({catalog,product,savedImageId='',refresh,onProductSaved}:{catalog:Catalog;product:ProductDraft;savedImageId?:string;refresh:()=>Promise<Catalog|null>;onProductSaved:(saved:ProductDraft)=>void}) {
  const activeTab=useSyncExternalStore(subscribeTab,currentTab,()=> 'product-basic' as DetailTab);
  function selectTab(id:DetailTab,focus=false) {
    window.history.replaceState(window.history.state,'',`#${id}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    if(focus)document.getElementById(`${id}-tab`)?.focus();
  }
  function onTabKey(event:KeyboardEvent<HTMLButtonElement>,index:number) {
    const next=event.key==='ArrowRight'?(index+1)%detailTabs.length:event.key==='ArrowLeft'?(index+detailTabs.length-1)%detailTabs.length:event.key==='Home'?0:event.key==='End'?detailTabs.length-1:null;
    if(next===null)return;
    event.preventDefault();selectTab(detailTabs[next].id,true);
  }
  const skus=catalog.skus.filter(item=>item.product_id===product.id);
  const pages=useListPagination(skus,product.id,'상품 옵션');
  const stock=productStockSummary(catalog,product.id);
  const productId=encodeURIComponent(product.id);
  return <section className="catalog-panel catalog-product-detail" aria-label="상품 상세 정보">
    <header className="catalog-product-title-row">
      <h2>{product.name}</h2>
      <div className="catalog-product-operation" aria-label="상품 운영 상태">
        <span className="catalog-note">상품 운영 상태</span>
        <StatusBadge kind={product.publication_status==='published'&&product.publication_visible?'stock_healthy':'unpublished'}>{product.publication_status==='published'?(product.publication_visible?'게시 중':'게시 설정 · 고객 화면 제외'):product.publication_status==='paused'?'게시 중지':product.publication_status==='draft'?'준비 중':'상태 확인 필요'}</StatusBadge>
        <Tooltip label="상품 운영 상태 안내" trigger={<span className="catalog-help-icon" aria-hidden="true">?</span>}><p>상품 운영 상태는 고객 화면 공개 설정입니다. 시안 진행 상태와 재고 상태는 별도로 관리합니다. 게시 중이어도 공개 필수 조건이 없어지면 고객 화면에서 제외됩니다.</p>{product.publication_reasons?.map(reason=><p key={reason}>{reason}</p>)}</Tooltip>
        <button type="button" className="catalog-link-button" onClick={()=>selectTab('product-pricing',true)}>가격·할인·공개 설정</button>
      </div>
    </header>
    <KeyFacts label="상품 재고 요약" items={[{label:'현재 보유 재고',value:`${stock.onHand.toLocaleString('ko-KR')}개`},{label:'등록 색상·사이즈',value:`${stock.count}개`},{label:'부족 옵션',value:`${skus.filter(sku=>sku.on_hand<=sku.reorder_point).length}개`,note:'사용 안 함 옵션도 재고에 포함'}]}/>
    <div className="catalog-actions catalog-toolbar product-detail-tabs" role="tablist" aria-label="상품 상세 영역">
      {detailTabs.map((tab,index)=><button key={tab.id} id={`${tab.id}-tab`} type="button" role="tab" aria-selected={activeTab===tab.id} aria-controls={tab.id} tabIndex={activeTab===tab.id?0:-1} onClick={()=>selectTab(tab.id)} onKeyDown={event=>onTabKey(event,index)}>{tab.label}</button>)}
    </div>
    <section id="product-basic" role="tabpanel" hidden={activeTab!=='product-basic'} className="product-hub-section" aria-labelledby="product-basic-tab">
      <h3 id="product-basic-title">기본정보 수정</h3>
      <ProductForm initial={product} categories={catalog.categories} seasonOptions={catalog.season_options} refresh={refresh} embedded onSaved={onProductSaved}/>
      <dl className="catalog-completion-details"><ProductFactorySummary productId={product.id}/></dl>
      <ProductImages scope="customer" key={product.id} productId={product.id} savedImageId={savedImageId}/>
    </section>
    <section id="product-pricing" role="tabpanel" hidden={activeTab!=='product-pricing'} className="product-hub-section" aria-labelledby="product-pricing-tab">
      <PublicationEditor id={product.id} onSaved={refresh}/>
    </section>
    <section id="product-options" role="tabpanel" hidden={activeTab!=='product-options'} className="product-hub-section" aria-labelledby="product-options-tab">
      <header className="product-hub-heading"><div><h3 id="product-options-title">색상·사이즈</h3><p className="catalog-note">등록된 조합의 사용 여부와 재고를 확인하고 사용 상태·부족 기준을 수정합니다.</p></div><Link className="catalog-link-button" href={`/admin/catalog/options/new?product_id=${productId}`}>색상·사이즈 등록</Link></header>
      {skus.length? <>{pages.summary}<div className="catalog-table-scroll" tabIndex={0} role="region" aria-label="상품 색상·사이즈 재고 표"><table><thead><tr><th>색상 / 사이즈</th><th>사용 상태</th><th>현재 재고</th><th>부족 표시 기준</th><th>재고 상태</th><th>관리</th></tr></thead><tbody>{pages.items.map(sku=><tr key={sku.id}><td><strong><ColorChip name={sku.color} showName/> / {sku.size}</strong><p className="catalog-note">{sku.code}</p></td><td><span className={`sku-usage-badge ${sku.is_active?'is-active':'is-inactive'}`}>{sku.is_active?'사용 중':'사용 안 함'}</span></td><td><strong className="catalog-important-quantity">{sku.on_hand.toLocaleString('ko-KR')}개</strong></td><td>{sku.reorder_point.toLocaleString('ko-KR')}개 이하</td><td><StatusBadge kind={sku.on_hand<=sku.reorder_point?'low_stock':'stock_healthy'}>{sku.on_hand<=sku.reorder_point?'부족':'양호'}</StatusBadge></td><td><Link className="catalog-link-button" aria-label={`${sku.color} ${sku.size} 옵션 수정`} href={`/admin/catalog/options/${encodeURIComponent(sku.id)}/edit`}>옵션 수정</Link></td></tr>)}</tbody></table></div>{pages.navigation}</>:<p className="catalog-note">등록된 색상·사이즈가 없습니다. 먼저 판매할 조합을 등록해 주세요.</p>}
    </section>
    <section id="product-stock" role="tabpanel" hidden={activeTab!=='product-stock'} className="product-hub-section" aria-labelledby="product-stock-tab">
      <header className="product-hub-heading"><div><h3 id="product-stock-title">재고</h3><p>현재 보유 <strong>{stock.onHand.toLocaleString('ko-KR')}개</strong> · 부족 옵션 <strong>{skus.filter(sku=>sku.on_hand<=sku.reorder_point).length}개</strong></p></div><Link className="catalog-link-button" href={`/admin/catalog/inventory?product_id=${productId}`}>이 상품 재고·변경 이력</Link></header>
      {skus.length>0?<nav className="catalog-actions" aria-label="이 상품 재고 변경">{[['receipt','입고 등록'],['out','출고 등록'],['adjust','재고 조정']].map(([flow,label])=><Link key={flow} className="catalog-link-button" href={`/admin/catalog/inventory/new?flow=${flow}&product_id=${productId}`}>{label}</Link>)}</nav>:<p className="catalog-note">색상·사이즈를 등록하면 입고·출고·조정을 기록할 수 있습니다.</p>}
    </section>
    <section id="product-reviews" role="tabpanel" hidden={activeTab!=='product-reviews'} className="product-hub-section" aria-labelledby="product-reviews-tab">
      <AdminReviewList productId={product.id} savedId="" embedded/>
    </section>
  </section>;
}
