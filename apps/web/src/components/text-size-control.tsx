'use client';

import { useEffect, useId, useSyncExternalStore } from 'react';
import './text-size-control.css';

const storageKey = 're-tbms-mall:text-size';
const changeEvent = 're-tbms-mall:text-size-change';
const choices = [
  { value: 'default', label: '기본' },
  { value: 'large', label: '크게' },
  { value: 'larger', label: '더 크게' },
] as const;
type TextSize = typeof choices[number]['value'];
let memoryPreference: TextSize | null = null;

function parsePreference(value: string | null): TextSize {
  return value === 'large' || value === 'larger' ? value : 'default';
}

function getSnapshot(): TextSize {
  if (memoryPreference !== null) return memoryPreference;
  try { memoryPreference = parsePreference(window.localStorage.getItem(storageKey)); }
  catch { memoryPreference = 'default'; }
  return memoryPreference;
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    memoryPreference = parsePreference(event.newValue);
    notify();
  };
  window.addEventListener(changeEvent, notify);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener('storage', onStorage);
  };
}

function setPreference(value: TextSize) {
  memoryPreference = value;
  try {
    if (value === 'default') window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, value);
  } catch { /* The current page still supports resizing when browser storage is blocked. */ }
  window.dispatchEvent(new Event(changeEvent));
}

export function TextSizeControl() {
  const size = useSyncExternalStore(subscribe, getSnapshot, () => 'default' as const);
  useEffect(() => { document.documentElement.dataset.textSize = size; }, [size]);

  return null;
}

export function TextSizeSetting() {
  const size = useSyncExternalStore(subscribe, getSnapshot, () => 'default' as const);
  const titleId = useId();
  return <div className="text-size-setting" role="group" aria-labelledby={titleId}>
    <h4 id={titleId} className="text-size-label">글자 크기</h4>
    <p className="text-size-help">편하게 읽을 수 있는 크기를 선택하세요. 이 브라우저에 저장됩니다.</p>
    <div className="text-size-actions">
      {choices.map(choice => <button key={choice.value} type="button" aria-label={`글자 크기 ${choice.label}`} aria-pressed={size === choice.value}
        onClick={() => setPreference(choice.value)}>{choice.label}</button>)}
    </div>
  </div>;
}