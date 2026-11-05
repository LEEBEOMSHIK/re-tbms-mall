'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useId, useRef} from 'react';
import {colorChipLabel} from '@/lib/color-chip';
import {won, type CartItem} from '@/lib/customer-shopping';
import {productSizeLabel} from '@/lib/product-option-labels';
import {shopImage} from '@/lib/storefront';
import styles from './cart-added-dialog.module.css';

export function CartAddedDialog({item, onClose}: {item: CartItem; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    heading.current?.focus({preventScroll: true});
  }, []);
  const close = () => dialog.current?.close();

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
    <header className={styles.header}>
      <span className={styles.check} aria-hidden="true">✓</span>
      <h2 id={titleId} ref={heading} tabIndex={-1}>장바구니에 담았어요.</h2>
      <button className={styles.close} type="button" onClick={close} aria-label="닫기">×</button>
    </header>
    <div className={styles.item}>
      {item.image && <Image src={shopImage(item.image)} alt="" width={64} height={80} unoptimized/>}
      <div><strong>{item.name}</strong><p>{colorChipLabel(item.color)} / {productSizeLabel(item.size)}</p></div>
    </div>
    <div className={styles.total}><span>장바구니 수량 {item.quantity}개</span><strong>{item.line_total === null ? '금액 확인 필요' : won(item.line_total)}</strong></div>
    <p className={styles.note}>장바구니에 담은 상품의 재고는 예약되지 않아요.</p>
    <div className={styles.actions}>
      <button type="button" onClick={close}>계속 선택하기</button>
      <Link href="/cart" className={styles.primary}>장바구니 보기</Link>
    </div>
    <Link href="/products" className={styles.browse}>계속 쇼핑하기 →</Link>
  </dialog>;
}
