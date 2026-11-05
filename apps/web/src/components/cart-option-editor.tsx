'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {parsePublicProduct, type Product} from '@/lib/storefront';
import type {CartItem} from '@/lib/customer-shopping';
import {colorChipLabel} from '@/lib/color-chip';
import {productSizeLabel} from '@/lib/product-option-labels';
import styles from './cart-layout.module.css';

export function CartOptionEditor({item, busy, onApply, onClose}: {
  item: CartItem; busy: boolean; onApply: (sku: string) => void; onClose: () => void;
}) {
  const id = useId();
  const [options, setOptions] = useState<Product['options']>([]);
  const [failed, setFailed] = useState(false);
  const [target, setTarget] = useState(item.sku_id);
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/shop/products/' + encodeURIComponent(item.product_id), {signal:controller.signal, cache:'no-store'});
        if (!response.ok) throw Error();
        const product = parsePublicProduct(await response.json());
        if (!controller.signal.aborted) setOptions(product.options);
      } catch { if (!controller.signal.aborted) setFailed(true); }
    }
    void load();
    return () => controller.abort();
  }, [item.product_id]);
  useEffect(() => { if (options.length) select.current?.focus({preventScroll:true}); }, [options]);
  return <div className={styles.editor}>
    {failed ? <span role="alert">옵션을 불러오지 못했어요. 닫은 뒤 다시 시도해 주세요.</span> :
      <><label htmlFor={id}>색상 · 사이즈</label><select id={id} ref={select} value={target} disabled={!options.length} onChange={e=>setTarget(e.target.value)}>
        {!options.length && <option value={item.sku_id}>옵션 확인 중</option>}
        {options.map(o=><option key={o.id} value={o.id} disabled={!o.available}>{colorChipLabel(o.color)} / {productSizeLabel(o.size)}{o.available?'':' · 품절'}</option>)}
      </select>
      <button disabled={busy || !options.some(o=>o.id===target && o.available) || target===item.sku_id} onClick={()=>onApply(target)}>변경 적용</button></>}
    <button onClick={onClose}>닫기</button>
    {busy && <small role="status">진행 중인 변경을 저장한 후 적용할 수 있어요.</small>}
  </div>;
}
