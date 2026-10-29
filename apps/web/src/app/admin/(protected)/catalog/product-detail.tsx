import {ProductPrice} from './product-price';
import {PublicationNotice} from './publication-notice';
import {KeyFacts} from '@/components/ui/key-facts';
import {useListPagination} from '@/components/ui/list-pagination';
import {StatusBadge} from '@/components/ui/status-badge';
import {Tooltip} from '@/components/ui/tooltip';
import {ProductFactorySummary} from '../factories/factory-admin';
import Link from 'next/link';
import {ProductImages} from './product-images';
import {categoryPath, type Catalog, type ProductDraft} from '@/lib/catalog';
import {productStockSummary} from '@/lib/inventory-summary';

export function ProductDetail({catalog,product,savedImageId=''}:{catalog:Catalog;product:ProductDraft;savedImageId?:string}) {
  const skus=catalog.skus.filter(item=>item.product_id===product.id);
  const pages=useListPagination(skus,product.id,'상품 옵션');
  const stock=productStockSummary(catalog,product.id);
  const productId=encodeURIComponent(product.id);
  const category=catalog.categories.find(item=>item.id===product.category_id);
  const inactiveCategory=category && (!category.is_active || (category.parent_id!==null && !catalog.categories.find(parent=>parent.id===category.parent_id)?.is_active));
  return <section className="catalog-panel catalog-product-detail" aria-label="상품 상세 정보">
    <header className="catalog-product-title-row">
      <h2>{product.name}</h2>
      <div className="catalog-product-operation" aria-label="상품 운영 상태">
        <span className="catalog-note">상품 운영 상태</span>
        <StatusBadge kind={product.publication_status==='published'&&product.publication_visible?'stock_healthy':'unpublished'}>{product.publication_status==='published'?(product.publication_visible?'게시 중':'게시 설정 · 고객 화면 제외'):product.publication_status==='paused'?'게시 중지':product.publication_status==='draft'?'준비 중':'상태 확인 필요'}</StatusBadge>
        <Tooltip label="상품 운영 상태 안내" trigger={<span className="catalog-help-icon" aria-hidden="true">?</span>}><p>상품 운영 상태는 고객 화면 공개 설정입니다. 시안 진행 상태와 재고 상태는 별도로 관리합니다. 게시 중이어도 공개 필수 조건이 없어지면 고객 화면에서 제외됩니다.</p>{product.publication_reasons?.map(reason=><p key={reason}>{reason}</p>)}</Tooltip>
        <Link className="catalog-link-button" href={`/admin/catalog/${productId}/publication/edit`}>가격·공개 설정</Link>
      </div>
    </header>
    <PublicationNotice id={product.id}/>
    <ProductPrice key={productId} id={productId}/><KeyFacts label="상품 재고 요약" items={[{label:'현재 보유 재고',value:`${stock.onHand.toLocaleString('ko-KR')}개`},{label:'등록 색상·사이즈',value:`${stock.count}개`},{label:'부족 옵션',value:`${skus.filter(sku=>sku.on_hand<=sku.reorder_point).length}개`,note:'사용 안 함 옵션도 재고에 포함'}]}/>
    <nav className="catalog-actions catalog-toolbar" aria-label="상품 상세 영역">
      <a className="catalog-link-button" href="#product-basic">기본정보</a>
      <a className="catalog-link-button" href="#product-options">색상·사이즈</a>
      <a className="catalog-link-button" href="#product-stock">재고</a>
    </nav>
    <section id="product-basic" className="product-hub-section" aria-labelledby="product-basic-title">
    <header className="product-hub-heading"><h3 id="product-basic-title">기본정보</h3><Link className="catalog-link-button" href={`/admin/catalog/${productId}/edit`}>기본정보 수정</Link></header>
    <dl className="catalog-completion-details catalog-product-detail-fields">
      <div><dt>고객 표시명</dt><dd>{product.name}</dd></div>
      <div><dt>내부 관리명</dt><dd>{product.internal_name}</dd></div>
      <div><dt>카테고리</dt><dd>{categoryPath(catalog.categories,product.category_id)}{inactiveCategory?' (사용 중지)':''}</dd></div>
      <div><dt>계절</dt><dd>{product.seasons.length?product.seasons.map(code=>catalog.season_options.find(option=>option.code===code)?.label||code).join(' · '):'계절 미지정'}</dd></div>
      <ProductFactorySummary productId={product.id}/>
      <div className="catalog-product-detail-description"><dt>상품 설명</dt><dd>{product.description||'등록된 설명이 없습니다.'}</dd></div>
    </dl>
    </section>
    <section id="product-options" className="product-hub-section" aria-labelledby="product-options-title">
      <header className="product-hub-heading"><div><h3 id="product-options-title">색상·사이즈</h3><p className="catalog-note">등록된 조합의 사용 여부와 재고를 확인하고 사용 상태·부족 기준을 수정합니다.</p></div><Link className="catalog-link-button" href={`/admin/catalog/options/new?product_id=${productId}`}>색상·사이즈 등록</Link></header>
      {skus.length? <>{pages.summary}<div className="catalog-table-scroll" tabIndex={0} role="region" aria-label="상품 색상·사이즈 재고 표"><table><thead><tr><th>색상 / 사이즈</th><th>사용 상태</th><th>현재 재고</th><th>부족 표시 기준</th><th>재고 상태</th><th>관리</th></tr></thead><tbody>{pages.items.map(sku=><tr key={sku.id}><td><strong>{sku.color} / {sku.size}</strong><p className="catalog-note">{sku.code}</p></td><td><span className={`sku-usage-badge ${sku.is_active?'is-active':'is-inactive'}`}>{sku.is_active?'사용 중':'사용 안 함'}</span></td><td><strong className="catalog-important-quantity">{sku.on_hand.toLocaleString('ko-KR')}개</strong></td><td>{sku.reorder_point.toLocaleString('ko-KR')}개 이하</td><td><StatusBadge kind={sku.on_hand<=sku.reorder_point?'low_stock':'stock_healthy'}>{sku.on_hand<=sku.reorder_point?'부족':'양호'}</StatusBadge></td><td><Link className="catalog-link-button" aria-label={`${sku.color} ${sku.size} 옵션 수정`} href={`/admin/catalog/options/${encodeURIComponent(sku.id)}/edit`}>옵션 수정</Link></td></tr>)}</tbody></table></div>{pages.navigation}</>:<p className="catalog-note">등록된 색상·사이즈가 없습니다. 먼저 판매할 조합을 등록해 주세요.</p>}
    </section>
    <section id="product-stock" className="product-hub-section" aria-labelledby="product-stock-title">
      <header className="product-hub-heading"><div><h3 id="product-stock-title">재고</h3><p>현재 보유 <strong>{stock.onHand.toLocaleString('ko-KR')}개</strong> · 부족 옵션 <strong>{skus.filter(sku=>sku.on_hand<=sku.reorder_point).length}개</strong></p></div><Link className="catalog-link-button" href={`/admin/catalog/inventory?product_id=${productId}`}>이 상품 재고·변경 이력</Link></header>
      {skus.length>0?<nav className="catalog-actions" aria-label="이 상품 재고 변경">{[['receipt','입고 등록'],['out','출고 등록'],['adjust','재고 조정']].map(([flow,label])=><Link key={flow} className="catalog-link-button" href={`/admin/catalog/inventory/new?flow=${flow}&product_id=${productId}`}>{label}</Link>)}</nav>:<p className="catalog-note">색상·사이즈를 등록하면 입고·출고·조정을 기록할 수 있습니다.</p>}
    </section>
    <ProductImages scope="customer" key={product.id} productId={product.id} savedImageId={savedImageId}/>
  </section>;
}
