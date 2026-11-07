'use client';
import Link from 'next/link';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {won} from '@/lib/customer-shopping';
import {cartEstimate, previewQuantities} from '@/lib/cart-selection';
import {checkoutEntryPath} from '@/lib/checkout-selection';
import {shopImage} from '@/lib/storefront';
import {ShoppingOption} from './shopping-option';
import {CartOptionEditor} from './cart-option-editor';
import {PurchaseGuidanceDialog} from './purchase-guidance-dialog';
import type {PurchaseGuidanceKind} from '@/lib/purchase-guidance';
import {useShoppingCart} from './use-shopping-cart';
import './customer-shopping.css';
import './ui/form-controls.css';
import styles from './cart-layout.module.css';

function CartEmpty({login=false}:{login?:boolean}){return <div className="customer-cart-empty"><span className="customer-cart-empty-icon" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg></span><h2>{login?'내 장바구니를 확인해 보세요':'아직 담은 상품이 없어요'}</h2><p>{login?'로그인하면 담아 둔 상품을 확인할 수 있어요.':'마음에 드는 상품을 담아 한곳에서 살펴보세요.'}</p><Link className="customer-cart-cta" href={login?'/login?return_to=%2Fcart':'/products'}>{login?'로그인하기':'상품 둘러보기'}<span aria-hidden="true"> →</span></Link></div>}

function DeleteIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 6h16M9 6V4h6v2M7 6l1 14h8l1-14M10 10v6m4-6v6"/></svg>;
}

export function CustomerCart() {
  const router=useRouter();
  const state=useShoppingCart();
  const {cart,selected,setSelected,blocked}=state;
  const [editing,setEditing]=useState<string|null>(null);
  const [removal,setRemoval]=useState<string[]>([]);
  const dialog=useRef<HTMLDialogElement>(null);
  const selectAll=useRef<HTMLInputElement>(null);
  const summary=useRef<HTMLElement>(null);
  const checkoutAttempt=useRef(0);
  const [guidance,setGuidance]=useState<PurchaseGuidanceKind|null>(null);
  const checkoutInFlight=useRef(false);
  const [checkoutWaiting,setCheckoutWaiting]=useState(false);
  const [checkoutError,setCheckoutError]=useState('');
  useEffect(()=>()=>{checkoutAttempt.current++;},[]);
  const items=cart?.items ?? [];
  const rows=previewQuantities(items,state.preview);
  const hasSummary=rows.length>0 && !state.auth;
  useEffect(()=>{
    const element=summary.current;
    if (!hasSummary || !element) return;
    // Measure only content/size changes; scrolling stays native CSS sticky.
    const measure=()=>element.style.setProperty('--cart-summary-height',`${element.getBoundingClientRect().height}px`);
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(element);
    return ()=>observer.disconnect();
  },[hasSummary]);
  const chosen=rows.filter(i=>selected.has(i.sku_id));
  const all=rows.length>0 && rows.length===chosen.length;
  const totalQuantity=rows.reduce((n,i)=>n+i.quantity,0);
  const chosenQuantity=chosen.reduce((n,i)=>n+i.quantity,0);
  const kinds=new Set(rows.map(i=>i.product_id || i.sku_id)).size;
  const estimate=cartEstimate(chosen,cart?.shipping_policy);
  const policy=cart?.shipping_policy;
  const unavailable=chosen.some(i=>!i.available);
  const canCheckout=!!cart && !!chosen.length && !unavailable && !state.checkoutBlocked;
  const calculating=chosen.some(item=>state.savingQuantities.has(item.sku_id));
  const calculationMessage=checkoutWaiting?'변경 금액 확인 후 주문서로 이동합니다.':calculating?'금액 확인 중…':'';
  const amount=estimate.estimated===null ? '배송비 확인 후' : won(estimate.estimated);
  useEffect(()=>{
    if (selectAll.current) selectAll.current.indeterminate=chosen.length>0 && !all;
  },[chosen.length,all]);
  function toggle(id:string) {
    cancelCheckout();
    setSelected(prev=>{const next=new Set(prev);if(next.has(id))next.delete(id);else next.add(id);return next;});
  }
  function cancelCheckout() {
    checkoutAttempt.current++;checkoutInFlight.current=false;setCheckoutWaiting(false);setCheckoutError('');
  }
  async function proceedToCheckout() {
    if (!canCheckout || checkoutInFlight.current) return;
    checkoutInFlight.current=true;
    const attempt=++checkoutAttempt.current;
    const skuIds=chosen.map(item=>item.sku_id);
    setCheckoutWaiting(true);setCheckoutError('');
    const confirmed=await state.checkoutCart();
    if (attempt!==checkoutAttempt.current) return;
    setCheckoutWaiting(false);
    if (!confirmed || skuIds.some(id=>!confirmed.items.some(item=>item.sku_id===id && item.available))) {
      checkoutInFlight.current=false;
      setCheckoutError('최신 수량과 금액을 확인한 후 다시 진행해 주세요.');
      return;
    }
    router.push(checkoutEntryPath({kind:'selected',skuIds,version:confirmed.version}));
  }
  function confirmRemoval(ids:string[]) {
    setRemoval(ids);
    dialog.current?.showModal();
  }
  const proceed=<button type="button" className={styles.checkout} disabled={!canCheckout} onClick={()=>void proceedToCheckout()}>결제하기 <span aria-hidden="true">→</span></button>;
  return <section className={`customer-shopping customer-cart ${styles.cart}`}>
    <header className={styles.heading}><div><p className="eyebrow">YOUR SELECTION</p><div className={styles.headingLine}><h1>장바구니</h1>
      {!!rows.length && <span>상품 {kinds}종 <i>·</i> 총 {totalQuantity}개</span>}</div></div>
      <Link href="/products" className={styles.back}>계속 쇼핑하기 <span aria-hidden="true">↗</span></Link>
    </header>
    {state.auth ? <CartEmpty login/> : <>
      <div className={styles.feedback} role="status">{state.notice}</div>
      {state.error && <div className={styles.error} role="alert">{state.error} <button disabled={state.busy} onClick={()=>void state.retry()}>{state.pending?'같은 요청 확인':'최신 상태 확인'}</button></div>}
      {!cart && !state.error && <p role="status">상품을 불러오고 있어요.</p>}
      {cart && !rows.length && <CartEmpty/>}
      {!!rows.length && <div className={styles.layout}>
        <section aria-label="담은 상품" className={styles.products}>
          <div className={styles.toolbar}><label><input ref={selectAll} type="checkbox" checked={all} onChange={()=>{cancelCheckout();setSelected(new Set(all?[]:rows.map(i=>i.sku_id)));}}/>전체 선택 <small>{chosen.length}/{rows.length}</small></label>
            <button type="button" disabled={!chosen.length} onClick={()=>confirmRemoval(chosen.map(i=>i.sku_id))}><DeleteIcon/>선택 삭제</button></div>
          <ul className={styles.items}>{rows.map(item=>{
            const max=Math.min(99,item.available_quantity);
            const canAdjust=item.effective_price!==null && max>0;
            return <li key={item.sku_id} className={styles.row}>
              <label className={styles.pick}><input type="checkbox" checked={selected.has(item.sku_id)} aria-label={item.name+' '+item.color+' '+item.size+' 선택'} onChange={()=>toggle(item.sku_id)}/></label>
              <div className={styles.photo}>{item.image?<Image unoptimized src={shopImage(item.image)} width={144} height={180} alt={item.name}/>:<span>이미지 준비 중</span>}</div>
              <div className={styles.copy}>
                <h2>{item.product_id?<Link href={'/products/'+encodeURIComponent(item.product_id)}>{item.name}</Link>:item.name}</h2>
                {item.product_id && <div className={styles.options}><ShoppingOption color={item.color} size={item.size}/>
                  <button className={styles.optionButton} aria-expanded={editing===item.sku_id} onClick={()=>setEditing(editing===item.sku_id?null:item.sku_id)}>옵션 변경</button></div>}
                {item.effective_price!==null && <p className={styles.unit}>개당 {won(item.effective_price)}</p>}
                {!item.available && <p className={styles.warning}>{item.available_quantity===0 && item.effective_price!==null?'품절':item.unavailable_reason} · 합계 제외</p>}
                <div className={styles.rowFoot}>
                  <div className={styles.quantityControl}><div className={styles.stepper} role="group" aria-label={item.name+' 수량'}>
                    <button aria-label="수량 줄이기" disabled={state.stepperBlocked || !canAdjust || item.quantity<=1} onClick={()=>state.adjust(item.sku_id,-1)}>−</button>
                    <output aria-label="수량">{item.quantity}</output>
                    <button aria-label="수량 늘리기" disabled={state.stepperBlocked || !canAdjust || item.quantity>=max} onClick={()=>state.adjust(item.sku_id,1)}>+</button>
                  </div></div><div className={styles.lineAmount}><strong aria-busy={state.savingQuantities.has(item.sku_id)}>{item.line_total===null?'구매 불가':won(item.line_total)}</strong><small className={styles.quantityStatus} role="status">{state.savingQuantities.has(item.sku_id)?'금액 확인 중…':state.savedQuantities.has(item.sku_id)?'금액 반영됨':''}</small></div>
                </div>
                {canAdjust && item.quantity>=max && <small className={styles.limit}>구매 가능 수량 {max}개</small>}
              </div>
              <button className={styles.delete} aria-label={item.name+' 삭제'} onClick={()=>confirmRemoval([item.sku_id])}><DeleteIcon/></button>
              {editing===item.sku_id && <CartOptionEditor item={item} busy={blocked} onClose={()=>setEditing(null)} onApply={async target=>{
                if(await state.change({kind:'option',sku:item.sku_id,target}))setEditing(null);
              }}/>}
            </li>;
          })}</ul>
        </section>
        <aside ref={summary} className={styles.summary} aria-label="주문 요약">
          <div className={styles.summaryHead}><h2>주문 요약</h2><span>선택 {chosenQuantity}개</span></div>
          <dl className={styles.breakdown} aria-busy={calculating}>
            <div><dt>상품 금액</dt><dd>{won(estimate.original)}</dd></div>
            <div><dt>상품 할인</dt><dd className={styles.discount}>{estimate.discount?'−':''}{won(estimate.discount)}</dd></div>
            <div><dt>예상 배송비 <small>일반 지역</small></dt><dd>{estimate.shipping===null?'배송지 입력 후 확인':won(estimate.shipping)}</dd></div>
          </dl>
          <div className={styles.total} aria-busy={calculating}><span>예상 결제금액</span><strong>{amount}</strong></div>
          <div className={styles.calculationStatus} role="status">{calculationMessage}</div>
          {checkoutError && <p role="alert">{checkoutError}</p>}
          {!chosen.length?<p>주문할 상품을 선택해 주세요.</p>:unavailable?<p>구매할 수 없는 옵션의 수량이나 선택을 확인해 주세요.</p>:null}
          <div className={styles.desktopAction}>{proceed}</div>
          <p>배송비는 배송지 확인 후 결정됩니다. 현재 결제 서비스 준비 중으로 주문서까지 진행할 수 있어요.</p>
          {policy && <div className={styles.benefit}>일반 지역 · 할인 후 {won(policy.free_threshold)} 이상 무료배송</div>}
          <div className={styles.policies} role="group" aria-label="구매 안내"><button type="button" aria-haspopup="dialog" onClick={()=>setGuidance('shipping')}>배송 안내 <span aria-hidden="true">›</span></button><button type="button" aria-haspopup="dialog" onClick={()=>setGuidance('returns')}>교환·반품 안내 <span aria-hidden="true">›</span></button></div>
        </aside>
        <div className={styles.dock}><div aria-busy={calculating}><small>{checkoutWaiting?'금액 확인 후 이동':calculating?'금액 확인 중…':`선택 ${chosenQuantity}개 · 예상 결제금액`}</small><strong>{amount}</strong></div>{proceed}</div>
      </div>}
    </>}
    {guidance && <PurchaseGuidanceDialog kind={guidance} policy={policy} onClose={()=>setGuidance(null)}/>}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="cart-remove-title" onClose={()=>setRemoval([])}>
      <h2 id="cart-remove-title">선택한 상품을 삭제할까요?</h2>
      <p>장바구니에서 선택한 옵션 {removal.length}건을 삭제합니다.</p>
      {blocked && <p role="status">{state.busy?'수량 등 진행 중인 변경을 저장한 후 삭제할 수 있어요.':'최신 장바구니 상태를 확인한 후 삭제해 주세요.'}</p>}
      <div><button type="button" autoFocus onClick={()=>dialog.current?.close()}>취소</button><button type="button" disabled={blocked} onClick={()=>{
        const ids=removal;dialog.current?.close();void state.change({kind:'remove',ids});
      }}>삭제하기</button></div>
    </dialog>
  </section>;
}
