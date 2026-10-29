'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './tooltip.css';

const openedEvent = 're-tbms-mall:tooltip-open';

/** Informational, non-interactive content. The trigger supports hover, keyboard focus and touch toggle. */
export function Tooltip({ label, trigger, children }: { label: string; trigger: ReactNode; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12, width: 280, maxHeight: 320, above: false });
  const button = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const anchor = useRef({ top: 0, left: 0 });
  const intent = useRef({ buttonHover: false, tooltipHover: false, focused: false, pinned: false });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const hide = useCallback(() => {
    clearTimer();
    intent.current.pinned = false;
    intent.current.tooltipHover = false;
    setOpen(false);
  }, [clearTimer]);

  function show() {
    clearTimer();
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(360, window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom - 20;
    const above = rect.top - 20;
    const useAbove = below < 260 && above > below;
    anchor.current = { top: rect.top, left: rect.left };
    setPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: useAbove ? rect.top - 8 : rect.bottom + 8,
      width,
      maxHeight: Math.max(40, useAbove ? above : below),
      above: useAbove,
    });
    window.dispatchEvent(new CustomEvent(openedEvent, { detail: id }));
    setOpen(true);
  }

  function scheduleClose() {
    clearTimer();
    closeTimer.current = setTimeout(() => {
      const current = intent.current;
      if (!current.buttonHover && !current.tooltipHover && !current.focused && !current.pinned) hide();
    }, 160);
  }

  useEffect(() => clearTimer, [clearTimer]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!button.current?.contains(event.target as Node) && !tooltip.current?.contains(event.target as Node)) hide();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); hide(); }
    };
    const scroll = (event: Event) => {
      if (tooltip.current?.contains(event.target as Node)) return;
      const rect = button.current?.getBoundingClientRect();
      if (rect && (Math.abs(rect.top - anchor.current.top) > 1 || Math.abs(rect.left - anchor.current.left) > 1)) hide();
    };
    const anotherOpened = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) hide(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', hide);
    window.addEventListener(openedEvent, anotherOpened);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener(openedEvent, anotherOpened);
    };
  }, [open, id, hide]);

  return <>
    <button ref={button} className="detail-tooltip-trigger" type="button" aria-label={label} aria-describedby={open ? id : undefined} aria-expanded={open}
      onPointerEnter={event => { if (event.pointerType === 'mouse') { intent.current.buttonHover = true; show(); } }}
      onPointerLeave={() => { intent.current.buttonHover = false; scheduleClose(); }}
      onFocus={() => { intent.current.focused = true; show(); }}
      onBlur={() => { intent.current.focused = false; intent.current.pinned = false; scheduleClose(); }}
      onKeyDown={event => {
        if (!open || !tooltip.current || !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const panel = tooltip.current;
        if (event.key === 'Home') panel.scrollTop = 0;
        else if (event.key === 'End') panel.scrollTop = panel.scrollHeight;
        else panel.scrollTop += (event.key === 'ArrowUp' || event.key === 'PageUp' ? -1 : 1) * (event.key.startsWith('Page') ? panel.clientHeight : 40);
      }}
      onClick={() => { if (intent.current.pinned) hide(); else { intent.current.pinned = true; show(); } }}>
      {trigger}
    </button>
    {open && createPortal(<div id={id} ref={tooltip} role="tooltip" className={`detail-tooltip${position.above ? ' detail-tooltip-above' : ''}`}
      style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}
      onPointerEnter={() => { intent.current.tooltipHover = true; clearTimer(); }}
      onPointerLeave={() => { intent.current.tooltipHover = false; scheduleClose(); }}>
      {children}
    </div>, document.body)}
  </>;
}
