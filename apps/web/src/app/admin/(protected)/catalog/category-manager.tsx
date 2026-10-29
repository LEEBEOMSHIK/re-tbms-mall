'use client';
import {KeyFacts,ValueStatus} from '@/components/ui/key-facts';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {useListPagination} from '@/components/ui/list-pagination';
import { SaveResult } from '@/components/ui/save-result';
import { catalogRequest, parseCategory, type Catalog, type CatalogCategory } from '@/lib/catalog';
import { Feedback, useOperation } from './catalog-forms';
import { FormChoice, FormLabel, FormRequiredHint, FormSelect } from '@/components/ui/form-controls';

const emptyCategory = { name: '', code: '', parent_id: '', sort_order: '0', is_active: true };

export function CategoryManager({ catalog, refresh, mode = 'list', categoryId = '', categoryKind = 'root' }: {
  catalog: Catalog; refresh: () => Promise<Catalog | null>; mode?: 'list' | 'new' | 'edit'; categoryId?: string; categoryKind?: 'root' | 'child';
}) {
  const initial = mode === 'edit' ? catalog.categories.find(category => category.id === categoryId) : undefined;
  const [form, setForm] = useState(initial ? { name: initial.name, code: initial.code, parent_id: initial.parent_id || '', sort_order: String(initial.sort_order), is_active: initial.is_active } : emptyCategory);
  const [editing, setEditing] = useState<CatalogCategory | null>(initial || null);
  const [kind, setKind] = useState<'root' | 'child'>(initial ? initial.parent_id ? 'child' : 'root' : categoryKind);
  const [completed, setCompleted] = useState<CatalogCategory | null>(null);
  const confirmed = useRef(false);
  const op = useOperation();
  const categoryPages=useListPagination(catalog.categories,'categories','카테고리');
  const roots = catalog.categories.filter(category => category.parent_id === null);

  function selectCategory(category: CatalogCategory) {
    setEditing(category);
    setForm({ name: category.name, code: category.code, parent_id: category.parent_id || '', sort_order: String(category.sort_order), is_active: category.is_active });
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (confirmed.current || (mode === 'edit' && !editing)) return;
    if (!editing && kind === 'child' && !roots.some(root => root.id === form.parent_id && root.is_active)) { op.setFailure('validation'); document.getElementById('category-parent')?.focus(); return; }
    void op.run(async () => {
      const changes = { name: form.name, sort_order: Number(form.sort_order), is_active: form.is_active };
      const result = await catalogRequest(editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories', parseCategory, {
        method: editing ? 'PUT' : 'POST',
        body: editing ? { ...changes, version: editing.version } : { ...changes, code: form.code, parent_id: kind === 'child' ? form.parent_id : null },
      });
      if (!result.ok) { op.setFailure(result.reason); return; }
      confirmed.current = true;
      setCompleted(result.data);
      const updated = await refresh();
      op.setNotice(updated ? '카테고리를 저장했습니다.' : '카테고리를 저장했습니다. 목록 갱신에 실패했으므로 다시 확인해 주세요.');
    });
  }

  if (mode === 'list') return <>
    <nav className="catalog-actions catalog-toolbar" aria-label="카테고리 등록">
      <Link className="catalog-link-button catalog-primary" href="/admin/catalog/categories/new?type=root">대분류 등록</Link>
      <Link className="catalog-link-button" href="/admin/catalog/categories/new?type=child">세부 카테고리 등록</Link>
    </nav>
    <section className="catalog-panel">
      <h2>카테고리 목록</h2>
      {categoryPages.summary}
      {!catalog.categories.length && <p className="catalog-empty-state">등록된 카테고리가 없습니다.</p>}
      <div className="catalog-table-scroll" tabIndex={0} role="region" aria-label="카테고리 목록">
        <table><thead><tr><th>카테고리 / 분류 경로</th><th>표시 순서</th><th>사용 상태</th><th>관리</th></tr></thead>
          <tbody>{categoryPages.items.map(category => <tr key={category.id} data-category-id={category.id}>
            <td><strong className="catalog-row-identity">{category.parent_id?`${roots.find(root=>root.id===category.parent_id)?.name||'상위 분류 없음'} > ${category.name}`:category.name}</strong><small>{category.parent_id?'세부 분류':'대분류'} · 코드 {category.code}</small></td><td>{category.sort_order}</td><td><ValueStatus tone={category.is_active?'success':'neutral'}>{category.is_active?'사용 중':'사용 중지'}</ValueStatus></td>
            <td><Link className="catalog-row-action" aria-label={`${category.name} 수정`} href={`/admin/catalog/categories/${category.id}/edit`}>수정</Link></td>
          </tr>)}</tbody>
        </table>
      </div>
      {categoryPages.navigation}
    </section>
  </>;

  if (mode === 'edit' && !editing) return <p role="alert">카테고리를 찾을 수 없습니다. <Link href="/admin/catalog/categories">목록으로 돌아가기</Link></p>;
  if (completed) return <SaveResult className="catalog-panel" title={mode === 'edit' ? '카테고리 수정이 완료되었습니다' : '카테고리 등록이 완료되었습니다'} actions={<>
    <Link className="catalog-link-button catalog-primary" href="/admin/catalog/categories">카테고리 목록</Link>
    {mode === 'new' ? <button type="button" disabled={op.busy} onClick={() => { confirmed.current = false; setCompleted(null); setForm(emptyCategory); op.setNotice(''); requestAnimationFrame(() => document.getElementById('category-name')?.focus()); }}>추가 등록</button> : <Link className="catalog-link-button" href="/admin/catalog/categories/new?type=root">추가 등록</Link>}
  </>}>
    <KeyFacts label="카테고리 저장 결과" items={[{label:'사용 상태',value:<ValueStatus tone={completed.is_active?'success':'neutral'}>{completed.is_active?'사용 중':'사용 중지'}</ValueStatus>}]}/>
    <dl className="catalog-completion-details">
      <div><dt>카테고리 이름</dt><dd>{completed.name}</dd></div><div><dt>코드</dt><dd>{completed.code}</dd></div>
      <div><dt>분류 유형</dt><dd>{completed.parent_id ? '세부 카테고리' : '대분류'}</dd></div>
      <div><dt>상위 대분류</dt><dd>{roots.find(root => root.id === completed.parent_id)?.name || '없음'}</dd></div>
      
    </dl><Feedback failure={null} notice={op.notice} />
  </SaveResult>;
  return <>
    <section className="catalog-panel catalog-form-panel">
      <h2>{editing ? '카테고리 수정' : '카테고리 등록'}</h2>
      <p className="catalog-note">대분류를 직접 등록하거나, 등록한 대분류 아래에 세부 카테고리를 추가할 수 있습니다. 표시 순서가 작을수록 앞에 나옵니다. 사용 중지는 신규 상품 선택에서 제외하며 기존 상품은 보존합니다. 코드와 상위 분류는 저장 후 변경할 수 없습니다.</p>
      <Feedback failure={op.failure} notice={op.notice} />
      <form id="category-form" className="ds-form" onSubmit={save}>
      <FormRequiredHint />
        <fieldset disabled={op.busy}>
          <FormLabel htmlFor="category-kind" required={!editing} hint={editing ? '변경 불가' : undefined}>분류 유형</FormLabel>
          <FormSelect id="category-kind" required={!editing} disabled={op.busy || !!editing} value={kind} onChange={value => { setKind(value as 'root' | 'child'); setForm({ ...form, parent_id: '' }); }} options={[{ value: 'root', label: '대분류' }, { value: 'child', label: '세부 카테고리' }]} />
          <FormLabel htmlFor="category-name" required>카테고리 이름</FormLabel>
          <input id="category-name" aria-labelledby="category-name-label" required maxLength={80} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} />
          <FormLabel htmlFor="category-code" required={!editing} hint="변경 불가">카테고리 코드</FormLabel>
          <input id="category-code" aria-labelledby="category-code-label" required pattern="[A-Z0-9]{2,12}" minLength={2} maxLength={12} readOnly={!!editing} value={form.code} onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} aria-describedby="category-code-help" />
          <p id="category-code-help" className="catalog-note">영문 대문자와 숫자 2~12자. 다른 카테고리와 중복할 수 없습니다.</p>
          {kind === 'child' && <>
            <FormLabel htmlFor="category-parent" required={!editing} hint={editing ? '변경 불가' : undefined}>상위 대분류</FormLabel>
            <FormSelect id="category-parent" required={!editing} disabled={op.busy || !!editing} value={form.parent_id} placeholder="상위 대분류 선택" onChange={value => setForm({ ...form, parent_id: value })} options={roots.filter(root => root.is_active || root.id === form.parent_id).map(root => ({ value: root.id, label: root.name + (!root.is_active ? ' (사용 중지)' : ''), disabled: !root.is_active }))} />
            {!editing && !roots.some(root => root.is_active) && <p>사용 중인 대분류가 없습니다. <Link href="/admin/catalog/categories/new?type=root">대분류를 먼저 등록하세요.</Link></p>}
          </>}
          <FormLabel htmlFor="category-order" required>표시 순서</FormLabel>
          <input id="category-order" aria-labelledby="category-order-label" type="number" required min={0} max={10000} step={1} value={form.sort_order} onChange={event => setForm({ ...form, sort_order: event.target.value })} />
          <FormChoice id="category-active" label="사용 중" className="ds-choice-compact catalog-active-choice" checked={form.is_active} onChange={event => setForm({ ...form, is_active: event.target.checked })} />
          <div className="catalog-actions">
            <button type="submit" className="catalog-primary">{op.busy ? '저장 중…' : editing ? '카테고리 수정 저장' : '카테고리 등록'}</button>
            <Link className="catalog-link-button" href="/admin/catalog/categories">취소하고 목록으로</Link>
            {editing && op.failure === 'conflict' && <button type="button" onClick={() => void op.run(async () => {
              const current = await refresh();
              if (!current) { op.setFailure('unavailable'); return; }
              const latest = current.categories.find(category => category.id === editing.id);
              if (!latest) { op.setFailure('missing'); return; }
              selectCategory(latest);
              op.setNotice('최신 내용을 불러왔습니다. 다시 확인 후 저장해 주세요.');
            })}>최신 카테고리 내용 불러오기</button>}
          </div>
          {editing && op.failure === 'conflict' && <p className="catalog-note">최신 내용을 불러오면 작성한 입력이 저장된 내용으로 바뀝니다.</p>}
        </fieldset>
      </form>
    </section>
  </>;
}



