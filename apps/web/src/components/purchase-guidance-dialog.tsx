'use client';

import {useEffect, useId, useRef} from 'react';
import {purchaseGuidance, purchaseGuidanceNotice, type PurchaseGuidanceKind} from '@/lib/purchase-guidance';
import {won, type Cart} from '@/lib/customer-shopping';
import styles from './purchase-guidance-dialog.module.css';

export function PurchaseGuidanceDialog({kind, policy, onClose}: {
  kind: PurchaseGuidanceKind; policy?: Cart['shipping_policy']; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const content = purchaseGuidance[kind];
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    heading.current?.focus({preventScroll: true});
    return () => { if (opener?.isConnected) opener.focus({preventScroll: true}); };
  }, []);
  const close = () => dialog.current?.close();
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    }}>
    <header className={styles.header}>
      <div><p>SHOPPING GUIDE</p><h2 ref={heading} id={titleId} tabIndex={-1}>{content.title}</h2></div>
      <button type="button" className={styles.close} aria-label="안내 닫기" onClick={close}>×</button>
    </header>
    <div className={styles.body}>
      {kind === 'shipping' && policy && <div className={styles.highlight}><span>일반 지역 기본 배송비 <strong>{won(policy.base_fee)}</strong></span><span>할인 후 <strong>{won(policy.free_threshold)}</strong> 이상 무료배송</span></div>}
      {content.sections.map(([title, body]) => <section key={title}><h3>{title}</h3><p>{body}</p></section>)}
      <p className={styles.notice}>{purchaseGuidanceNotice}</p>
    </div>
    <footer className={styles.footer}><button type="button" onClick={close}>확인했어요</button></footer>
  </dialog>;
}
