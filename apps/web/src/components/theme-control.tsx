'use client';

import { useEffect, useId, useSyncExternalStore } from 'react';
import { parseTheme, resolveTheme, themeStorageKey, type ThemePreference } from '@/lib/theme';
import './theme-control.css';

const changeEvent = 're-tbms-mall:theme-change';
let memoryPreference: ThemePreference | null = null;

function getSnapshot(): ThemePreference {
  if (memoryPreference !== null) return memoryPreference;
  try { memoryPreference = parseTheme(window.localStorage.getItem(themeStorageKey)); }
  catch { memoryPreference = 'system'; }
  return memoryPreference;
}

function applyTheme() {
  let systemDark = false;
  try { systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { /* Default light if media queries are unavailable. */ }
  document.documentElement.dataset.theme = resolveTheme(getSnapshot(), systemDark);
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== themeStorageKey && event.key !== null) return;
    // Ignore sessionStorage events, while allowing browsers with blocked storage.
    try { if (event.storageArea && event.storageArea !== window.localStorage) return; } catch { /* Current-session memory remains available. */ }
    memoryPreference = parseTheme(event.newValue);
    applyTheme();
    notify();
  };
  window.addEventListener(changeEvent, notify);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener('storage', onStorage);
  };
}

function setPreference(value: ThemePreference) {
  memoryPreference = value;
  try { window.localStorage.setItem(themeStorageKey, value); } catch { /* Keep the selected theme in this page when persistence is blocked. */ }
  applyTheme();
  window.dispatchEvent(new Event(changeEvent));
}

/** Restore independently of the settings dialog, including OS and other-tab changes. */
export function ThemeControl() {
  useEffect(() => {
    applyTheme();
    const unsubscribe = subscribe(() => applyTheme());
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => { if (getSnapshot() === 'system') applyTheme(); };
    media.addEventListener('change', onSystemChange);
    return () => { unsubscribe(); media.removeEventListener('change', onSystemChange); };
  }, []);
  return null;
}

export function ThemeSetting() {
  const preference = useSyncExternalStore(subscribe, getSnapshot, () => 'system' as const);
  const titleId = useId();
  return <div className="theme-setting" role="group" aria-labelledby={titleId}>
    <h4 id={titleId} className="theme-label">테마</h4>
    <p className="theme-help">이 브라우저에 저장됩니다. 시스템은 기기의 화면 설정을 따릅니다.</p>
    <div className="theme-actions">
      {([['light', '라이트'], ['dark', '다크'], ['system', '시스템']] as const).map(([value, label]) => <button key={value} type="button" aria-label={`테마 ${label}`} aria-pressed={preference === value} onClick={() => setPreference(value)}>{label}</button>)}
    </div>
  </div>;
}
