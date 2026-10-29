'use client';

import { useEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import './form-controls.css';

type FormChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children' | 'className'> & {
  id: string;
  label: string;
  caption?: string;
  className?: string;
};

/** A native checkbox with a full-card label. Captions are decorative, not extra accessible names. */
export function FormChoice({ id, label, caption, className = '', ...inputProps }: FormChoiceProps) {
  return (
    <span className={`ds-choice ${className}`}>
      <input {...inputProps} id={id} type="checkbox" className="ds-choice-input" aria-labelledby={inputProps['aria-labelledby'] || `${id}-label`} />
      <label className="ds-choice-label" htmlFor={id}>
        <span className="ds-choice-copy">
          <span id={`${id}-label`} className="ds-choice-title">{label}</span>
          {caption && <span className="ds-choice-caption" aria-hidden="true">{caption}</span>}
        </span>
        <span className="ds-choice-check" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" focusable="false"><path d="m4 8 2.5 2.5L12 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </label>
    </span>
  );
}

export function FormLabel({ htmlFor, required = false, hint, children, as = 'label' }: {
  htmlFor: string; required?: boolean; hint?: string; children: ReactNode; as?: 'label' | 'span';
}) {
  const Tag = as;
  return <Tag className="ds-form-label" {...(as === 'label' ? { htmlFor } : {})}>
    <span id={`${htmlFor}-label`}>{children}</span>
    {(required || hint) && <span className={`ds-field-hint${required ? ' ds-field-required' : ''}`} aria-hidden="true">{required ? '*' : hint}</span>}
  </Tag>;
}

export function FormRequiredHint() {
  return <p className="ds-required-hint"><span className="ds-field-required" aria-hidden="true">*</span> 필수 입력</p>;
}

export type FormSelectOption = { value: string; label: string; disabled?: boolean };
type FormSelectProps = {
  id: string;
  value: string;
  options: FormSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  describedBy?: string;
  name?: string;
};

/** Select-only combobox. Keep the associated FormLabel and controlled value together. */
export function FormSelect({ id, value, options, onChange, placeholder = '선택해 주세요', required = false, disabled = false, describedBy, name }: FormSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [invalid, setInvalid] = useState(false);
  const [openedContext, setOpenedContext] = useState('');
  const [position, setPosition] = useState({ above: false, maxHeight: 280 });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const measuredAnchor = useRef<{ top: number; left: number } | null>(null);
  const search = useRef({ text: '', time: 0 });
  const context = JSON.stringify({ value, options });
  const visible = open && !disabled && openedContext === context;
  const selected = options.find(option => option.value === value);
  const error = invalid && required && !value;
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
  const activeOption = visible && active >= 0 && !options[active]?.disabled ? options[active] : undefined;

  function unavailable() { return disabled || !!trigger.current?.matches(':disabled'); }
  function measure() {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    measuredAnchor.current = { top: rect.top, left: rect.left };
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const useAbove = below < 200 && above > below;
    setPosition({ above: useAbove, maxHeight: Math.max(80, Math.min(280, useAbove ? above : below)) });
  }
  function show(last = false) {
    if (unavailable()) return;
    measure();
    setOpenedContext(context);
    const current = options.findIndex(option => option.value === value && !option.disabled);
    setActive(current >= 0 ? current : (last ? enabled.at(-1) : enabled[0]) ?? -1);
    setOpen(true);
  }
  function commit(index: number) {
    const option = options[index];
    if (unavailable() || !option || option.disabled) return;
    onChange(option.value);
    setInvalid(false);
    setOpen(false);
    trigger.current?.focus();
  }
  function move(direction: number) {
    const current = enabled.indexOf(active);
    setActive(enabled[Math.max(0, Math.min(enabled.length - 1, current + direction))] ?? -1);
  }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (unavailable()) return;
    if (event.key === 'Tab') { setOpen(false); return; }
    if (event.key === 'Escape') {
      if (visible) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (!visible) {
        show(event.key === 'ArrowUp' || event.key === 'End');
        if (event.key === 'Home') setActive(enabled[0] ?? -1);
        if (event.key === 'End') setActive(enabled.at(-1) ?? -1);
      } else if (event.key === 'ArrowDown') move(1);
      else if (event.key === 'ArrowUp') move(-1);
      else if (event.key === 'Home') setActive(enabled[0] ?? -1);
      else if (event.key === 'End') setActive(enabled.at(-1) ?? -1);
      else commit(active);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = (now - search.current.time > 700 ? '' : search.current.text) + event.key.toLocaleLowerCase();
      search.current = { text, time: now };
      const match = enabled.find(index => options[index].label.toLocaleLowerCase().startsWith(text));
      if (!visible) show();
      if (match !== undefined) setActive(match);
    }
  }

  useEffect(() => {
    if (!visible) return;
    const onOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onResize = () => measure();
    const onScroll = (event: Event) => {
      if (list.current?.contains(event.target as Node)) return;
      const rect = trigger.current?.getBoundingClientRect();
      const measured = measuredAnchor.current;
      // Click-to-focus may deliver a queued scroll after opening; its final position was already measured.
      if (rect && measured && (Math.abs(rect.top - measured.top) > 1 || Math.abs(rect.left - measured.left) > 1)) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('pointerdown', onOutside); window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onScroll, true); };
  }, [visible]);

  useEffect(() => {
    if (!visible || active < 0) return;
    const item = list.current?.querySelector<HTMLElement>(`[data-option-index="${active}"]`);
    if (!item || !list.current) return;
    const itemTop = item.offsetTop;
    if (itemTop < list.current.scrollTop) list.current.scrollTop = itemTop;
    else if (itemTop + item.offsetHeight > list.current.scrollTop + list.current.clientHeight) list.current.scrollTop = itemTop + item.offsetHeight - list.current.clientHeight;
  }, [active, visible]);

  useEffect(() => {
    const fieldset = trigger.current?.closest('fieldset');
    if (!fieldset) return;
    const observer = new MutationObserver(() => { if (fieldset.disabled) setOpen(false); });
    observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });
    return () => observer.disconnect();
  }, []);

  return <><div className="ds-select" ref={root}>
    <select className="ds-select-native" aria-hidden="true" tabIndex={-1} name={name} value={value} required={required} disabled={disabled}
      onChange={event => { if (!unavailable()) { onChange(event.target.value); setInvalid(false); } }}
      onInvalid={event => {
        event.preventDefault();
        setInvalid(true);
        const firstInvalid = event.currentTarget.form?.querySelector('input:invalid, select:invalid, textarea:invalid');
        if (!firstInvalid || firstInvalid === event.currentTarget) trigger.current?.focus();
      }}>
      {!options.some(option => option.value === '') && <option value="">{placeholder}</option>}
      {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
    <button ref={trigger} id={id} className="ds-select-trigger" type="button" role="combobox" disabled={disabled}
      aria-labelledby={`${id}-label`} aria-expanded={visible} aria-controls={`${id}-listbox`} aria-haspopup="listbox"
      aria-required={required} aria-invalid={error || undefined} aria-describedby={[describedBy, error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
      aria-activedescendant={activeOption ? `${id}-option-${active}` : undefined}
      onKeyDown={onKeyDown} onClick={() => { if (!unavailable()) { if (visible) setOpen(false); else show(); } }}>
      <span className={selected ? '' : 'ds-select-placeholder'}>{selected?.label || placeholder}</span>
      <svg className="ds-select-chevron" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {visible && <ul ref={list} id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`} className={`ds-select-listbox${position.above ? ' ds-select-above' : ''}`} style={{ maxHeight: position.maxHeight }}>
      {options.length ? options.map((option, index) => <li id={`${id}-option-${index}`} key={option.value} data-option-index={index} role="option"
        aria-selected={option.value === value} aria-disabled={option.disabled || undefined}
        className={`ds-select-option${index === active ? ' ds-select-active' : ''}`}
        onPointerMove={() => { if (!option.disabled && !unavailable()) setActive(index); }}
        onMouseDown={event => event.preventDefault()} onClick={() => commit(index)}>
        <span>{option.label}</span>{option.value === value && <span className="ds-select-selected" aria-hidden="true">✓</span>}
      </li>) : <li className="ds-select-empty" role="presentation">선택할 항목이 없습니다.</li>}
    </ul>}
  </div>{error && <p className="ds-field-error" id={`${id}-error`} role="alert">항목을 선택해 주세요.</p>}</>;
}
