'use client';

import { useId, useRef, type ReactNode } from 'react';
import './site-settings.css';

/** The shell owns modal behavior only; setting sections are provided by the caller. */
export function SiteSettingsButton({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  function open() {
    if (dialog.current?.open) return;
    dialog.current?.showModal();
    closeButton.current?.focus();
  }

  return <>
    <button className="site-settings-trigger" ref={trigger} type="button" aria-label="사이트 설정 열기" aria-haspopup="dialog" onClick={open}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="m9.8 3-.5 2-1.6.9-2-.6-2.2 3.8 1.5 1.4v1.9l-1.5 1.4 2.2 3.8 2-.6 1.6.9.5 2h4.4l.5-2 1.6-.9 2 .6 2.2-3.8-1.5-1.4v-1.9l1.5-1.4-2.2-3.8-2 .6-1.6-.9-.5-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="12" cy="11.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
    <dialog className="site-settings-dialog" ref={dialog} aria-labelledby={titleId}
      onClose={() => trigger.current?.focus()}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
          .filter(control => control.tabIndex >= 0 && !control.closest('[hidden], [inert], [aria-hidden="true"]') && control.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !event.currentTarget.contains(active))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (active === last || !event.currentTarget.contains(active))) {
          event.preventDefault(); first?.focus();
        }
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.currentTarget.close();
      }}>
      <div className="site-settings-heading">
        <h2 id={titleId}>사이트 설정</h2>
        <button ref={closeButton} className="site-settings-close" type="button" aria-label="사이트 설정 닫기" onClick={() => dialog.current?.close()}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="site-settings-content">{children}</div>
    </dialog>
  </>;
}

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const titleId = useId();
  return <section className="site-settings-section" aria-labelledby={titleId}>
    <h3 id={titleId}>{title}</h3>
    {description && <p className="site-settings-section-description">{description}</p>}
    <div className="site-settings-section-content">{children}</div>
  </section>;
}
