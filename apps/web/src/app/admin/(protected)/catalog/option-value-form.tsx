'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { catalogRequest, parseOptionValue, type Catalog, type CatalogFailure, type OptionValue } from '@/lib/catalog';
import { FormChoice, FormLabel, FormRequiredHint } from '@/components/ui/form-controls';

const errors: Record<CatalogFailure, string> = {
  auth: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  conflict: '이미 같은 이름이나 코드가 있거나 다른 변경이 반영되었습니다. 최신 목록을 확인해 주세요.',
  validation: '이름·코드·표시 순서를 확인해 주세요. 코드는 영문 대문자와 숫자 1~12자입니다.',
  missing: '항목을 찾을 수 없습니다. 최신 목록을 확인해 주세요.',
  unavailable: '저장 결과를 확인할 수 없습니다. 입력은 유지됩니다. 목록에서 저장 여부를 먼저 확인해 주세요.',
};

export function OptionValueForm({ kind, initial, idPrefix = 'option-value', onSaved, onCancel, refresh, activeOnly = false, onBusyChange }: {
  kind: OptionValue['kind']; initial?: OptionValue; idPrefix?: string;
  onSaved: (value: OptionValue) => Promise<void>; onCancel?: () => void; refresh: () => Promise<Catalog | null>;
  activeOnly?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const [form, setForm] = useState({ name: initial?.name || '', code: initial?.code || '', sort_order: String(initial?.sort_order ?? 0), is_active: initial?.is_active ?? true });
  const [version, setVersion] = useState(initial?.version);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const label = kind === 'color' ? '색상' : '사이즈';

  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true; setBusy(true); onBusyChange?.(true); setFailure(null); setNotice('');
    try {
      const changes = { name: form.name, sort_order: Number(form.sort_order), is_active: activeOnly || form.is_active };
      const result = await catalogRequest(initial ? `/api/admin/option-values/${initial.id}` : '/api/admin/option-values', parseOptionValue, {
        method: initial ? 'PUT' : 'POST', body: initial ? { ...changes, version } : { ...changes, kind, code: form.code },
      });
      if (!result.ok) { setFailure(result.reason); return; }
      if (initial) setVersion(result.data.version);
      else setForm({ name: '', code: '', sort_order: '0', is_active: true });
      setNotice(`${label} 기준정보를 저장했습니다.`);
      await onSaved(result.data);
    } finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }

  async function loadLatest() {
    if (!initial || lock.current) return;
    lock.current = true; setBusy(true); onBusyChange?.(true);
    try {
      const catalog = await refresh();
      if (!catalog) { setFailure('unavailable'); return; }
      const latest = catalog.option_values?.find(value => value.id === initial.id);
      if (!latest) { setFailure('missing'); return; }
      setForm({ name: latest.name, code: latest.code, sort_order: String(latest.sort_order), is_active: latest.is_active });
      setVersion(latest.version); setFailure(null); setNotice('최신 내용을 불러왔습니다. 확인 후 저장해 주세요.');
    } finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }

  return <form id={`${idPrefix}-form`} className="ds-form" onSubmit={event => void save(event)}>
    <FormRequiredHint />
    {failure && <p role="alert" className="admin-session-error">{errors[failure]} {failure === 'auth' && <Link href="/admin/login">관리자 로그인</Link>}</p>}
    <div aria-live="polite">{notice && <p className="catalog-notice">{notice}</p>}</div>
    <fieldset disabled={busy}>
      <FormLabel htmlFor={`${idPrefix}-name`} required>{label} 이름</FormLabel>
      <input id={`${idPrefix}-name`} aria-labelledby={`${idPrefix}-name-label`} required maxLength={80} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
      <FormLabel htmlFor={`${idPrefix}-code`} required={!initial} hint="변경 불가">{label} 코드</FormLabel>
      <input id={`${idPrefix}-code`} aria-labelledby={`${idPrefix}-code-label`} required pattern="[A-Z0-9]{1,12}" maxLength={12} readOnly={!!initial} value={form.code} onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} />
      <p className="catalog-note">코드는 영문 대문자·숫자 1~12자이며 저장 후 변경할 수 없습니다.</p>
      <FormLabel htmlFor={`${idPrefix}-order`} required>표시 순서</FormLabel>
      <input id={`${idPrefix}-order`} aria-labelledby={`${idPrefix}-order-label`} type="number" required min={0} max={10000} step={1} value={form.sort_order} onChange={event => setForm({ ...form, sort_order: event.target.value })} />
      {!activeOnly && <FormChoice id={`${idPrefix}-active`} label="사용 중" className="ds-choice-compact catalog-active-choice" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} />}
      <div className="catalog-actions">
        <button type="submit" className="catalog-primary">{busy ? '저장 중…' : `${label} ${initial ? '수정 저장' : '추가'}`}</button>
        {onCancel && <button type="button" onClick={onCancel}>취소</button>}
        {initial && failure === 'conflict' && <button type="button" onClick={() => void loadLatest()}>최신 내용 불러오기</button>}
      </div>
      {initial && failure === 'conflict' && <p className="catalog-note">최신 내용을 불러오면 작성한 입력이 저장된 내용으로 바뀝니다.</p>}
    </fieldset>
  </form>;
}

