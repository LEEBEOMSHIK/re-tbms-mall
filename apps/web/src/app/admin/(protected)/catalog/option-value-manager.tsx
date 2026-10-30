'use client';
import {ColorChip} from '@/components/ui/color-chip';
import {KeyFacts,ValueStatus} from '@/components/ui/key-facts';

import { useState } from 'react';
import Link from 'next/link';
import {useListPagination} from '@/components/ui/list-pagination';
import type { Catalog, OptionValue } from '@/lib/catalog';
import { OptionValueForm } from './option-value-form';
import { SaveResult } from '@/components/ui/save-result';

export function OptionValueManager({ catalog, refresh, mode = 'list', valueId, initialKind = 'color' }: {
  catalog: Catalog; refresh: () => Promise<Catalog | null>;
  mode?: 'list' | 'new' | 'edit'; valueId?: string; initialKind?: 'color' | 'size';
}) {
  const [kind, setKind] = useState<OptionValue['kind']>(initialKind);
  const [saved, setSaved] = useState<OptionValue | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const editing = mode === 'edit' ? catalog.option_values?.find(value => value.id === valueId) : undefined;
  const values = (catalog.option_values || []).filter(value => value.kind === kind);
  const currentKind = editing?.kind || kind;
  const label = currentKind === 'color' ? '색상' : '사이즈';
  const valuePages=useListPagination(values,kind,`${label} 기준정보`);

  if (saved) return <SaveResult title={`${saved.kind === 'color' ? '색상' : '사이즈'} 기준정보를 ${mode === 'edit' ? '수정' : '등록'}했습니다.`}
    actions={<>
      <Link className="catalog-link-button catalog-primary" href="/admin/catalog/option-values">기준정보 목록</Link>
      {mode === 'new' ? <button disabled={refreshing} onClick={() => { setSaved(null); setRefreshFailed(false); setFormKey(key => key + 1); requestAnimationFrame(() => document.getElementById("option-value-name")?.focus()); }}>다른 {label} 등록</button>
        : <Link className="catalog-link-button" href={`/admin/catalog/option-values/new?kind=${saved.kind}`}>다른 {label} 등록</Link>}
      <Link className="catalog-link-button" href="/admin/catalog/options/new">상품 색상·사이즈 등록</Link>
    </>}>
    <p><strong>{saved.name}</strong> · <span className="catalog-note">{saved.code}</span></p><KeyFacts label="기준정보 저장 결과" items={[{label:'사용 상태',value:<ValueStatus tone={saved.is_active?'success':'neutral'}>{saved.is_active?'사용 중':'사용 중지'}</ValueStatus>}]}/>
    <p>기존 상품 옵션의 이름과 코드는 그대로 보존됩니다.</p>
    {refreshFailed && <p role="status">저장은 완료됐지만 목록을 갱신하지 못했습니다. 목록에서 새로고침해 주세요.</p>}
  </SaveResult>;

  if (mode !== 'list') return <>
    <div className="catalog-actions catalog-toolbar"><Link className="catalog-link-button" href="/admin/catalog/option-values">기준정보 목록으로</Link></div>
    {catalog.option_values === undefined ? <section className="catalog-panel"><p role="alert">기준정보를 불러오지 못했습니다.</p><button onClick={() => void refresh()}>다시 불러오기</button></section>
      : mode === 'edit' && !editing ? <section className="catalog-panel"><h2>수정할 기준정보를 찾을 수 없습니다.</h2><p>목록에서 항목을 다시 선택해 주세요.</p></section>
        : <section className="catalog-panel catalog-form-panel">
          <h2>{label} {mode === 'edit' ? '수정' : '등록'}</h2>
          <p className="catalog-note">기준정보 종류와 코드는 저장 후 변경할 수 없습니다. 사용 중지는 새 상품 옵션의 선택을 제한합니다.</p>
          <OptionValueForm key={`${mode}-${valueId || currentKind}-${formKey}`} kind={currentKind} initial={editing} refresh={refresh}
            onSaved={async value => {
              setRefreshing(true); setSaved(value);
              const updated = await refresh();
              setRefreshFailed(!updated); setRefreshing(false);
            }} />
        </section>}
  </>;

  return <>
    <div className="catalog-actions catalog-toolbar catalog-domain-tools" role="group" aria-label="기준정보 종류">
      <button aria-pressed={kind === 'color'} onClick={() => setKind('color')}>색상 기준정보</button>
      <button aria-pressed={kind === 'size'} onClick={() => setKind('size')}>사이즈 기준정보</button>
      <button onClick={() => void refresh()}>기준정보 새로고침</button>
      <Link className="catalog-link-button" href="/admin/catalog/options/new">상품 색상·사이즈 등록</Link>
    </div>
    <p className="catalog-note">상품에 사용할 색상과 사이즈를 먼저 등록하세요. 사용 중지한 항목은 새 조합에 선택할 수 없으며 기존 상품 옵션은 보존됩니다.</p>
    {catalog.option_values === undefined && <p role="alert">기준정보를 불러오지 못했습니다. 새로고침해 주세요.</p>}
    <div className="catalog-actions">
      <Link className="catalog-link-button catalog-primary" href="/admin/catalog/option-values/new?kind=color">색상 등록</Link>
      <Link className="catalog-link-button" href="/admin/catalog/option-values/new?kind=size">사이즈 등록</Link>
    </div>
    <section className="catalog-panel">
      <h2>{label} 목록</h2>
      {valuePages.summary}
      {!values.length ? <p>등록된 {label}이 없습니다.</p> : <div className="catalog-table-scroll" tabIndex={0} role="region" aria-label={`${label} 기준정보 목록`}>
        <table><thead><tr><th>이름 / 코드</th><th>표시 순서</th><th>사용 상태</th><th>관리</th></tr></thead>
          <tbody>{valuePages.items.map(value => <tr key={value.id} data-option-value-id={value.id}>
            <td><strong className="catalog-row-identity">{value.kind==='color'?<ColorChip name={value.name} showName/>:value.name}</strong><small>코드 {value.code}</small></td><td>{value.sort_order}</td><td><ValueStatus tone={value.is_active?'success':'neutral'}>{value.is_active?'사용 중':'사용 중지'}</ValueStatus></td>
            <td><Link className="catalog-link-button" aria-label={`${value.name} 수정`} href={`/admin/catalog/option-values/${value.id}/edit`}>수정</Link></td>
          </tr>)}</tbody>
        </table>
      </div>}
      {valuePages.navigation}
    </section>
  </>;
}



