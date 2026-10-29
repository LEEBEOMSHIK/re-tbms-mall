'use client';
import {KeyFacts} from '@/components/ui/key-facts';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {inventoryFlowConfig,inventoryFlowReasons,inventoryFlows,inventorySignedDelta} from '@/lib/inventory-flow';
import { useRouter } from 'next/navigation';
import { Tooltip } from '@/components/ui/tooltip';
import { OptionValueForm } from './option-value-form';
import { SaveResult } from '@/components/ui/save-result';
import { FormChoice, FormLabel, FormRequiredHint, FormSelect } from '@/components/ui/form-controls';
import {
  catalogRequest, movementReasonLabels, movementRequest, parseMovementConfirmation, parseProduct, parseSelectedSkuBatch, toggleSeason, internalNamePreview,
  type Catalog, type CatalogCategory, type CatalogFailure, type MovementRequest, type MovementReasonCode, type ProductDraft, type SeasonCode, type SeasonOption, type OptionValue,
} from '@/lib/catalog';

type Refresh = () => Promise<Catalog | null>;
const emptyProduct = { name: '', category_id: '', seasons: [] as SeasonCode[], description: '' };
const seasonCaptions: Record<SeasonCode, string> = { SP: 'Spring', SU: 'Summer', FA: 'Fall', WI: 'Winter', ALL: 'All seasons' };
const messages: Record<CatalogFailure, string> = {
  auth: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  conflict: '다른 변경 또는 중복 값과 충돌했습니다. 최신 내용과 입력값을 확인해 주세요.',
  validation: '입력값과 선택 항목을 확인해 주세요. 분류·계절은 등록 가능한 조합이어야 하며 수량은 정수여야 합니다.',
  missing: '대상을 찾을 수 없습니다. 상품 목록에서 다시 확인해 주세요.',
  unavailable: '서버 응답을 확인할 수 없습니다. 입력은 유지됩니다. 저장 여부를 먼저 확인해 주세요.',
};

export function useOperation() {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);
  const [notice, setNotice] = useState('');
  const lock = useRef(false);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    setNotice('');
    try { await action(); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, failure, notice, setFailure, setNotice, run };
}

export function Feedback({ failure, notice }: { failure: CatalogFailure | null; notice: string }) {
  return <>
    <div aria-live="polite">{notice && <p className="catalog-notice">{notice}</p>}</div>
    {failure && <div role="alert" className="admin-session-error">
      {messages[failure]} {failure === 'auth' && <Link href="/admin/login">관리자 로그인</Link>}
    </div>}
  </>;
}

export function ProductForm({ initial, categories, seasonOptions, refresh }: { initial?: ProductDraft; categories: CatalogCategory[]; seasonOptions: SeasonOption[]; refresh: Refresh }) {
  const [product, setProduct] = useState(initial ? {
    name: initial.name, category_id: initial.category_id, seasons: initial.seasons, description: initial.description,
  } : emptyProduct);
  const initialCategory = categories.find(category => category.id === initial?.category_id);
  const [rootId, setRootId] = useState(initialCategory?.parent_id || initialCategory?.id || '');
  const [baseline, setBaseline] = useState(initial);
  const [inputError, setInputError] = useState('');
  const [revision, setRevision] = useState(initial?.version);
  const [savedId, setSavedId] = useState('');
  const [savedInternalName, setSavedInternalName] = useState('');
  const [completedProduct, setCompletedProduct] = useState<ProductDraft | null>(null);
  const completedGuard = useRef(false);
  const completionHeading = useRef<HTMLHeadingElement>(null);
  const focusNewForm = useRef(false);
  const op = useOperation();
  const selectedCategory = categories.find(category => category.id === product.category_id);
  const selectedRoot = categories.find(category => category.id === rootId);
  const classificationRequired = !baseline || baseline.category_id !== product.category_id || baseline.seasons.join() !== product.seasons.join();

  useEffect(() => {
    if (completedProduct) {
      completionHeading.current?.focus({ preventScroll: true });
      completionHeading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    } else if (focusNewForm.current) {
      focusNewForm.current = false;
      const name = document.getElementById('product-name');
      name?.focus({ preventScroll: true });
      name?.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [completedProduct]);

  function save(event: FormEvent) {
    event.preventDefault();
    if (completedGuard.current) return;
    setInputError('');
    const unchanged = baseline && baseline.category_id === product.category_id && baseline.seasons.join() === product.seasons.join();
    if (!unchanged && (!selectedCategory?.parent_id || !selectedCategory.is_active || !selectedRoot?.is_active || !product.seasons.length)) {
      setInputError('사용 중인 대분류와 세부 카테고리를 선택하고 계절을 한 개 이상 선택해 주세요. 기존 상품은 분류와 계절을 그대로 두고 이름만 수정할 수 있습니다.');
      const target = !selectedRoot?.is_active ? 'product-root-category'
        : !selectedCategory?.parent_id || !selectedCategory.is_active ? 'product-category'
          : `season-${seasonOptions[0]?.code}`;
      document.getElementById(target)?.focus();
      return;
    }
    void op.run(async () => {
      const result = await catalogRequest(initial ? `/api/admin/products/${initial.id}` : '/api/admin/products', parseProduct, {
        method: initial ? 'PUT' : 'POST',
        body: { ...product, ...(initial ? { version: revision } : {}) },
      });
      if (!result.ok) { op.setFailure(result.reason); return; }
      if (initial) {
        setSavedId(result.data.id);
        setSavedInternalName(result.data.internal_name);
        setRevision(result.data.version);
        setBaseline(result.data);
        completedGuard.current = true; setCompletedProduct(result.data);
      } else {
        completedGuard.current = true;
        setCompletedProduct(result.data);
      }
    });
  }

  if (completedProduct && initial) return <SaveResult className="catalog-panel" title="상품 수정이 완료되었습니다" actions={<>
    <Link className="catalog-link-button catalog-primary" href={`/admin/catalog/${encodeURIComponent(completedProduct.id)}`}>상품 상세로</Link>
    <button type="button" onClick={() => { setProduct({ name: completedProduct.name, category_id: completedProduct.category_id, seasons: completedProduct.seasons, description: completedProduct.description }); completedGuard.current = false; focusNewForm.current = true; setCompletedProduct(null); }}>계속 수정</button>
  </>}><dl className="catalog-completion-details">
    <div><dt>고객 표시명</dt><dd>{completedProduct.name}</dd></div>
    <div><dt>내부 관리명</dt><dd>{completedProduct.internal_name}</dd></div>
    <div><dt>카테고리</dt><dd>{completedProduct.category}</dd></div>
    <div><dt>설명</dt><dd>{completedProduct.description || '없음'}</dd></div>
  </dl><p className="catalog-note">상품 정보가 저장되었습니다. 게시 중인 상품은 고객 화면에도 변경 내용이 반영됩니다.</p></SaveResult>;
  if (completedProduct && !initial) return <SaveResult className="catalog-panel catalog-form-panel catalog-form-wide" title="상품 등록이 완료되었습니다" status="기본 정보 저장 완료" actions={<>
    <Link className="catalog-link-button catalog-primary" href={`/admin/catalog/${encodeURIComponent(completedProduct.id)}`}>상품 상세로</Link>
    <Link className="catalog-link-button" href={`/admin/catalog/options/new?product_id=${encodeURIComponent(completedProduct.id)}`}>색상·사이즈 등록</Link>
      <button type="button" onClick={() => {
        setProduct(emptyProduct);
        setRootId('');
        setInputError('');
        setSavedId('');
        setSavedInternalName('');
        op.setFailure(null);
        op.setNotice('');
        completedGuard.current = false;
        focusNewForm.current = true;
        setCompletedProduct(null);
      }}>다른 상품 등록</button>
</>}><dl className="catalog-completion-details"><div><dt>고객 표시명</dt><dd>{completedProduct.name}</dd></div><div><dt>내부 관리명</dt><dd><output id="saved-internal-name" aria-label="저장한 상품의 내부 관리명">{completedProduct.internal_name}</output></dd></div></dl><div className="catalog-completion-next"><h3>다음은 색상과 사이즈를 등록해 주세요</h3><p>상품 상세에서 색상·사이즈 등록과 재고 관리를 이어갈 수 있습니다. 지금은 기본 정보만 저장되었으며 고객 화면에는 게시되지 않았습니다.</p></div></SaveResult>;

  return <section className="catalog-panel catalog-form-panel catalog-form-wide">
    <h2>상품 기본 정보</h2>
    <Feedback failure={op.failure} notice={op.notice} />
    {inputError && <p id="product-validation-error" role="alert" className="admin-session-error">{inputError}</p>}
    {savedId && <div className="catalog-saved-product">
      <p>저장한 상품의 내부 관리명: <output id="saved-internal-name" aria-label="저장한 상품의 내부 관리명">{savedInternalName}</output></p>
      <div className="catalog-actions catalog-success-links">
        <Link href="/admin/catalog">목록에서 확인</Link>
        <Link href={`/admin/catalog/options/new?product_id=${encodeURIComponent(savedId)}`}>이 상품의 색상·사이즈 등록</Link>
      </div>
    </div>}
    <form id="product-form" className="ds-form" onSubmit={save}>
      <FormRequiredHint />
      <fieldset disabled={op.busy} className="catalog-form-grid">
        <div className="catalog-field">
        <FormLabel htmlFor="product-name" required>고객 표시명</FormLabel>
        <input id="product-name" aria-labelledby="product-name-label" required maxLength={120} value={product.name} onChange={event => setProduct({ ...product, name: event.target.value })} />
        </div>
        <div className="catalog-field">
        <FormLabel htmlFor="product-internal-name" hint="자동 생성">내부 관리명</FormLabel>
        <input id="product-internal-name" aria-labelledby="product-internal-name-label" readOnly value={initial ? (savedInternalName || initial.internal_name) : ''} placeholder={internalNamePreview(categories, product.category_id, product.seasons)} aria-describedby="internal-name-help" />
        <p id="internal-name-help" className="catalog-note">{initial ? '처음 등록할 때 정해진 이름입니다. 카테고리와 계절을 바꿔도 내부 관리명은 유지됩니다.' : '대분류·세부 분류·계절을 반영해 저장할 때 자동으로 부여됩니다. 실제 번호는 저장 후 확인할 수 있습니다.'}</p>
        </div>
        <div className="catalog-field">
        <FormLabel htmlFor="product-root-category" required={classificationRequired} hint="변경 시 필수">대분류</FormLabel>
        <FormSelect id="product-root-category" required={classificationRequired} disabled={op.busy} value={rootId} placeholder="대분류 선택" describedBy={`classification-help${inputError ? ' product-validation-error' : ''}`}
          onChange={value => { setRootId(value); setProduct({ ...product, category_id: '' }); }}
          options={categories.filter(category => category.parent_id === null && (category.is_active || category.id === rootId)).map(category => ({ value: category.id, label: category.name + (!category.is_active ? ' (사용 중지)' : ''), disabled: !category.is_active }))} />
        </div>
        <div className="catalog-field">
        <FormLabel htmlFor="product-category" required={classificationRequired} hint="변경 시 필수">세부 카테고리</FormLabel>
        <FormSelect id="product-category" required={classificationRequired} disabled={op.busy} value={product.category_id} placeholder="세부 카테고리 선택" describedBy={`classification-help${inputError ? ' product-validation-error' : ''}`}
          onChange={value => setProduct({ ...product, category_id: value })}
          options={[
            ...(selectedCategory?.parent_id === null ? [{ value: selectedCategory.id, label: '세부 분류 미지정 (기존 상품)', disabled: true }] : []),
            ...categories.filter(category => category.parent_id === rootId && ((category.is_active && selectedRoot?.is_active) || category.id === product.category_id)).map(category => ({ value: category.id, label: category.name + (!category.is_active || !selectedRoot?.is_active ? ' (사용 중지)' : ''), disabled: !category.is_active || !selectedRoot?.is_active })),
          ]} />
        </div>
        <p id="classification-help" className="catalog-note">신규 등록하거나 분류·계절을 바꿀 때는 대분류·세부 카테고리·계절을 모두 선택해야 합니다. 기존 미지정 상품은 그대로 두고 이름만 수정할 수 있습니다.</p>
        <fieldset className="catalog-season-options">
          <legend><FormLabel as="span" htmlFor="product-seasons" required={classificationRequired} hint="변경 시 필수">계절</FormLabel></legend>
          <p className="catalog-note">여러 계절을 선택할 수 있습니다. 사계절은 다른 계절과 함께 선택하지 않으며, 네 계절을 모두 고르면 사계절로 묶습니다.</p>
          {!product.seasons.length && initial && <p className="catalog-note">계절 미지정</p>}
          <div className="ds-choice-grid">{seasonOptions.map(season => <FormChoice
            key={season.code}
            id={`season-${season.code}`}
            label={season.label}
            caption={seasonCaptions[season.code]}
            className={season.code === 'ALL' ? 'ds-choice-wide' : ''}
            checked={product.seasons.includes(season.code)}
            aria-describedby={inputError ? 'product-validation-error' : undefined}
            onChange={() => setProduct({ ...product, seasons: toggleSeason(product.seasons, season.code) })}
          />)}</div>
        </fieldset>

        <div className="catalog-field catalog-field-wide">
        <FormLabel htmlFor="product-description" hint="선택">설명</FormLabel>
        <textarea id="product-description" aria-labelledby="product-description-label" maxLength={2000} rows={5} value={product.description} onChange={event => setProduct({ ...product, description: event.target.value })} />
        </div>
        <div className="catalog-actions">
          <button className="catalog-primary" type="submit">{op.busy ? (initial ? '저장 중…' : '등록 중…') : (initial ? '상품 수정 저장' : '상품 등록')}</button>
          <Link className="catalog-link-button ds-form-action" href={initial?`/admin/catalog/${encodeURIComponent(initial.id)}`:"/admin/catalog"}>{initial?'취소하고 상품 상세로':'취소하고 목록으로'}</Link>
        </div>
        {initial && op.failure === 'conflict' && <>
          <p className="catalog-note">최신 내용을 불러오면 지금 작성한 입력이 저장된 내용으로 바뀝니다.</p>
          <button type="button" onClick={() => void op.run(async () => {
            const current = await refresh();
            if (!current) { op.setFailure('unavailable'); return; }
            const latest = current.products.find(item => item.id === initial.id);
            if (!latest) { op.setFailure('missing'); return; }
            setProduct({ name: latest.name, category_id: latest.category_id, seasons: latest.seasons, description: latest.description });
            const latestCategory = current.categories.find(category => category.id === latest.category_id);
            setRootId(latestCategory?.parent_id || latestCategory?.id || '');
            setBaseline(latest);
            setInputError('');
            setRevision(latest.version);
            setSavedInternalName(latest.internal_name);
            op.setNotice('최신 상품 내용을 불러왔습니다. 확인 후 수정해 주세요.');
          })}>최신 상품 내용 불러오기</button>
        </>}
      </fieldset>
    </form>
  </section>;
}

export function OptionForm({ catalog, productId, refresh }: { catalog: Catalog; productId: string; refresh: Refresh }) {
  const contextProduct=catalog.products.find(item=>item.id===productId);
  const [option, setOption] = useState({ product_id: catalog.products.some(item => item.id === productId) ? productId : '', color_ids: [] as string[], size_ids: [] as string[] });
  const [quickKind, setQuickKind] = useState<OptionValue['kind'] | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [createdValues, setCreatedValues] = useState<OptionValue[]>([]);
  const [completed, setCompleted] = useState<ReturnType<typeof parseSelectedSkuBatch> | null>(null);
  const [completedProductInfo,setCompletedProductInfo]=useState<{id:string;name:string}|null>(null);
  const [rowInputs, setRowInputs] = useState<Record<string, { excluded: boolean; stock: string; reorder: string }>>({});
  const [commonReorder, setCommonReorder] = useState('0');
  const [commonStock, setCommonStock] = useState('0');
  const [stockNotice, setStockNotice] = useState('');
  const [stockError, setStockError] = useState('');
  const [applyNotice, setApplyNotice] = useState('');
  const [applyError, setApplyError] = useState('');
  const completedGuard = useRef(false);
  const completionHeading = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef('');
  const [inputError, setInputError] = useState('');
  const op = useOperation();
  const values = [...(catalog.option_values || []), ...createdValues.filter(value => !catalog.option_values?.some(item => item.id === value.id))];
  const selectedProduct = catalog.products.find(item => item.id === option.product_id);
  const colors = option.color_ids.map(id => values.find(value => value.id === id && value.kind === 'color')).filter((value): value is OptionValue => !!value);
  const sizes = option.size_ids.map(id => values.find(value => value.id === id && value.kind === 'size')).filter((value): value is OptionValue => !!value);
  const total = option.color_ids.length * option.size_ids.length;
  const overLimit = option.color_ids.length > 50 || option.size_ids.length > 50 || total > 200;
  const combinations = overLimit ? [] : colors.flatMap(color => sizes.map(size => {
    const existing = catalog.skus.find(sku => sku.product_id === option.product_id && sku.color_id === color.id && sku.size_id === size.id);
    const key = `${color.id}-${size.id}`;
    return { color, size, key, code: existing?.code || `${selectedProduct?.internal_name || ''}-${color.code}-${size.code}`, existing, excluded: rowInputs[key]?.excluded ?? false, stock: rowInputs[key]?.stock ?? '0', reorder: rowInputs[key]?.reorder ?? '0' };
  }));
  const existingCount = combinations.filter(item => item.existing).length;
  const targets = combinations.filter(item => !item.existing && !item.excluded);
  const excludedCount = combinations.filter(item => !item.existing && item.excluded).length;
  const validStocks = targets.every(item => item.stock.trim() !== '' && Number.isInteger(Number(item.stock)) && Number(item.stock) >= 0 && Number(item.stock) <= 1000000);
  const stockTotal = targets.reduce((sum, item) => sum + Number(item.stock), 0);
  const disabled = op.busy || quickBusy;

  useEffect(() => {
    if (completed) { completionHeading.current?.focus(); completionHeading.current?.scrollIntoView({ block: 'start' }); }
    else if (quickKind) document.getElementById(`quick-${quickKind}-name`)?.focus();
    else if (pendingFocus.current) { document.getElementById(pendingFocus.current)?.focus(); pendingFocus.current = ''; }
  }, [completed, quickKind]);

  function toggle(kind: OptionValue['kind'], id: string) {
    const key = kind === 'color' ? 'color_ids' : 'size_ids';
    setOption(current => ({ ...current, [key]: current[key].includes(id) ? current[key].filter(value => value !== id) : [...current[key], id] }));
    setInputError('');
  }
  function save(event: FormEvent) {
    event.preventDefault();
    if (quickBusy || completedGuard.current) return;
    setInputError('');
    if (!colors.length || !sizes.length || colors.length !== option.color_ids.length || sizes.length !== option.size_ids.length || [...colors, ...sizes].some(value => !value.is_active)) {
      setInputError('사용 중인 색상과 사이즈를 각각 하나 이상 선택해 주세요.');
      const invalidColor = !colors.length || colors.length !== option.color_ids.length || colors.some(value => !value.is_active);
      document.getElementById(invalidColor ? 'batch-color-group' : 'batch-size-group')?.focus(); return;
    }
    if (overLimit) { setInputError('색상과 사이즈는 각각 50개, 조합은 한 번에 200개까지 등록할 수 있습니다. 선택을 줄여 주세요.'); return; }
    if (!targets.length) { setInputError('저장할 신규 조합이 없습니다. 색상과 사이즈를 선택하거나 제외한 조합을 복원해 주세요. 기존 옵션 수정은 상품 상세의 색상·사이즈 현황에서 진행합니다.'); return; }
    if (!validStocks) { setInputError('초기 입고 수량은 0부터 1,000,000까지의 정수로 입력해 주세요.'); return; }
    const invalidThreshold = targets.find(item => item.reorder.trim() === '' || !Number.isInteger(Number(item.reorder)) || Number(item.reorder) < 0 || Number(item.reorder) > 1000000);
    if (invalidThreshold) {
      setInputError('재고 부족 표시 기준은 0부터 1,000,000까지의 정수로 입력해 주세요.');
      document.getElementById(`reorder-point-${invalidThreshold.key}`)?.focus(); return;
    }
    void op.run(async () => {
      const payload = { product_id: option.product_id, items: targets.map(item => ({ color_id: item.color.id, size_id: item.size.id, initial_stock: Number(item.stock), reorder_point: Number(item.reorder) })) };
      const result = await catalogRequest('/api/admin/skus/selected-batch', raw => parseSelectedSkuBatch(raw, payload), { method: 'POST', body: payload });
      if (!result.ok) { op.setFailure(result.reason); return; }
      completedGuard.current = true; setCompletedProductInfo({id:payload.product_id,name:selectedProduct?.name||'등록 상품'}); setCompleted(result.data); setQuickKind(null);
      const updated = await refresh();
      if (!updated) op.setNotice('등록 결과는 확인되었습니다. 최신 정보 조회에 실패했습니다. 상품 상세에서 최신 내용을 확인해 주세요.');
    });
  }

  if (completed && completedProductInfo) return <SaveResult className="catalog-panel" title="색상·사이즈 등록이 완료되었습니다" actions={<><Link className="catalog-link-button catalog-primary" href={`/admin/catalog/${encodeURIComponent(completedProductInfo.id)}`}>상품 상세로</Link><Link className="catalog-link-button" href={`/admin/catalog/inventory/new?product_id=${encodeURIComponent(completedProductInfo.id)}`}>재고 입고·조정</Link><button type="button" disabled={op.busy} onClick={() => { completedGuard.current = false; pendingFocus.current = contextProduct?'batch-color-group':'option-product'; setOption(current => ({ ...current, color_ids: [], size_ids: [] })); setCompleted(null); setRowInputs({}); setCommonReorder('0'); setCommonStock('0'); setStockNotice(''); setStockError(''); setApplyNotice(''); setApplyError(''); setInputError(''); op.setNotice(''); }}>추가 등록</button></>}><p>{completedProductInfo.name}</p>
    <KeyFacts label="옵션 등록 결과" items={[{label:'새로 등록한 옵션',value:`${completed.created.length}개`,note:`기존 등록 ${completed.existing.length}개는 보존됩니다.`},{label:'초기 입고 합계',value:`${completed.created.reduce((sum,sku)=>sum+sku.on_hand,0)}개`}]} />
    {!completed.created.length && <p>선택한 조합이 모두 등록되어 있어 새로 등록한 조합은 없습니다.</p>}
    {!!completed.created.length && <><h3>새로 등록한 색상·사이즈</h3><ul className="catalog-batch-codes">{completed.created.map(sku => <li key={sku.id}>{sku.color} / {sku.size} — {sku.code} · 초기 입고 {sku.on_hand}개 · 재고 부족 표시 기준 {sku.reorder_point}개{sku.on_hand === 0 ? ' · 입고 필요' : ''}</li>)}</ul></>}
    <p className="catalog-note">기존 옵션의 재고는 변경하지 않았습니다. 초기 입고가 0개인 옵션은 재고 입고를 진행해 주세요. 상품 상세에서 공개 설정을 확인해 주세요.</p>
    <Feedback failure={null} notice={op.notice} />
  </SaveResult>;

  return <section className="catalog-panel catalog-form-panel catalog-form-wide">
    <h2>판매할 색상과 사이즈</h2>
    {contextProduct&&<p className="catalog-note">등록 대상: <strong>{contextProduct.name}</strong> · {contextProduct.internal_name}</p>}
    <p className="catalog-note">색상과 사이즈를 선택한 뒤 등록할 조합과 초기 입고 수량을 지정하세요. 기존 옵션은 그대로 유지됩니다.</p>
    <p className="catalog-notice">이 화면은 새 색상·사이즈 등록용입니다. 기존 옵션의 재고 부족 표시 기준은 <Link className="catalog-link-button" href={option.product_id?`/admin/catalog/${encodeURIComponent(option.product_id)}#product-options`:"/admin/catalog/inventory"}>{option.product_id?'상품 상세에서 수정':'재고 현황에서 수정'}</Link>하세요.</p>
    {!catalog.products.length && <p>먼저 <Link href="/admin/catalog/new">상품을 등록해 주세요.</Link></p>}
    <div className="catalog-actions catalog-domain-tools"><button type="button" disabled={disabled} onClick={() => void refresh()}>기준정보 새로고침</button><Link href="/admin/catalog/option-values" target="_blank" rel="noopener noreferrer">기준정보 관리 (새 탭)</Link></div>
    <Feedback failure={op.failure} notice={op.notice} />
    {inputError && <p id="batch-input-error" role="alert" className="admin-session-error">{inputError}</p>}
    <form id="bulk-inputs" aria-label="공통 적용 입력" onSubmit={event => event.preventDefault()} />
    <form id="sku-form" className="ds-form" onSubmit={save}>
      <FormRequiredHint />
      <fieldset disabled={disabled || !catalog.products.length}>
        <FormLabel htmlFor="option-product" required>대상 상품</FormLabel>
        <FormSelect id="option-product" required disabled={disabled || !catalog.products.length || !!contextProduct} value={option.product_id} placeholder="상품 선택" onChange={value => { if(contextProduct)return; if (value !== option.product_id) { setRowInputs({}); setCommonReorder('0'); setCommonStock('0'); setStockNotice(''); setStockError(''); setApplyNotice(''); setApplyError(''); } setOption({ ...option, product_id: value }); setInputError(''); }} options={catalog.products.map(item => ({ value: item.id, label: `${item.internal_name} · ${item.name}` }))} />
        <div className="catalog-selection-grid">{(['color', 'size'] as const).map(kind => {
          const key = kind === 'color' ? 'color_ids' : 'size_ids';
          const label = kind === 'color' ? '색상' : '사이즈';
          const available = values.filter(value => value.kind === kind && (value.is_active || option[key].includes(value.id))).sort((a, b) => a.sort_order - b.sort_order);
          return <fieldset key={kind} id={`batch-${kind}-group`} className="catalog-batch-group" tabIndex={-1} aria-describedby={inputError ? 'batch-input-error' : undefined}>
            <legend><FormLabel as="span" htmlFor={`batch-${kind}`} required>{label} 선택</FormLabel></legend>
            <div className="catalog-actions"><button type="button" onClick={() => setOption(current => ({ ...current, [key]: available.filter(value => value.is_active).map(value => value.id) }))}>{label} 전체 선택</button><button type="button" onClick={() => setOption(current => ({ ...current, [key]: [] }))}>{label} 선택 해제</button></div>
            {!available.length && <p>등록된 {label}이 없습니다. 아래 빠른 추가를 이용하세요.</p>}
            <div className="catalog-batch-choices">{available.map(value => <FormChoice key={value.id} id={`batch-${kind}-${value.id}`} label={value.name} caption={`${value.code}${value.is_active ? '' : ' · 사용 중지'}`} checked={option[key].includes(value.id)} onChange={() => toggle(kind, value.id)} />)}</div>
          </fieldset>;
        })}</div>
    <section className="catalog-threshold-tools ds-form" aria-label="초기 입고 수량 일괄 적용">
      <div className="catalog-tool-heading"><h3>실제 재고 · 초기 입고 수량</h3><Tooltip label="초기 입고 수량 도움말" trigger={<span className="catalog-help-icon" aria-hidden="true">?</span>}><p>등록할 각 조합의 초기 입고 수량을 같은 값으로 바꿉니다. 기존 입력에 더하지 않습니다. 예: 3개 조합에 10개씩 적용하면 총 30개입니다. 재고 부족 표시 기준은 바뀌지 않습니다.</p><p>제외·기존 옵션은 변경하지 않습니다. 적용 후 각 행에서 수정할 수 있고 이후 추가한 조합은 0으로 시작합니다. 실제 재고와 입고 이력은 아래 선택 조합 등록·저장을 눌러 저장합니다.</p></Tooltip></div>
      <FormLabel htmlFor="common-stock">공통 초기 입고 수량</FormLabel>
      <input id="common-stock" aria-labelledby="common-stock-label" form="bulk-inputs" type="number" min={0} max={1000000} step={1} value={commonStock} disabled={disabled || !targets.length} onChange={event => { setCommonStock(event.target.value); setStockError(''); setStockNotice(''); }} />
      <p>적용 대상: 신규 등록 {targets.length}개 조합</p>
      <button type="button" disabled={disabled || !targets.length} onClick={() => {
        if (commonStock.trim() === '' || !Number.isInteger(Number(commonStock)) || Number(commonStock) < 0 || Number(commonStock) > 1000000) { setStockError('초기 입고 수량은 0부터 1,000,000까지의 정수로 입력해 주세요.'); setStockNotice(''); document.getElementById('common-stock')?.focus(); return; }
        setRowInputs(current => { const next = { ...current }; targets.forEach(item => { next[item.key] = { excluded: false, stock: commonStock, reorder: item.reorder }; }); return next; });
        setStockError(''); setStockNotice(`적용 당시 등록 대상 ${targets.length}개에 초기 입고 ${Number(commonStock)}개씩 입력했습니다. 총 ${targets.length * Number(commonStock)}개이며 아직 저장 전입니다.`);
      }}>초기 입고 수량 일괄 적용</button>
      {stockError && <p role="alert" className="admin-session-error">{stockError}</p>}
      <p role="status">{stockNotice}</p>
    </section>
    <section className="catalog-threshold-tools ds-form" aria-label="재고 부족 표시 기준 일괄 적용">
      <div className="catalog-tool-heading"><h3>상태 표시 · 재고 부족 표시 기준</h3><Tooltip label="재고 부족 표시 기준 도움말" trigger={<span className="catalog-help-icon" aria-hidden="true">?</span>}><p>실제 입고 수량을 바꾸지 않습니다. 현재 재고가 기준 이하이면 확인 필요를 표시합니다. 0은 재고가 없을 때만 표시합니다. 값을 입력한 뒤 적용 버튼을 눌러야 현재 등록 대상에 반영됩니다. 제외·기존 옵션은 바뀌지 않으며 이후 추가하는 조합은 0으로 시작합니다. 각 행에서 다시 수정할 수 있습니다.</p></Tooltip></div>
      <FormLabel htmlFor="common-reorder">공통 재고 부족 표시 기준</FormLabel>
      <input id="common-reorder" aria-labelledby="common-reorder-label" form="bulk-inputs" type="number" min={0} max={1000000} step={1} value={commonReorder} disabled={disabled || !targets.length} onChange={event => { setCommonReorder(event.target.value); setApplyNotice(''); setApplyError(''); }} />
      <p>일괄 적용 대상 {targets.length}개</p>
      <button type="button" disabled={disabled || !targets.length} onClick={() => {
        if (commonReorder.trim() === '' || !Number.isInteger(Number(commonReorder)) || Number(commonReorder) < 0 || Number(commonReorder) > 1000000) { setApplyError('0부터 1,000,000까지의 정수를 입력해 주세요.'); setApplyNotice(''); document.getElementById('common-reorder')?.focus(); return; }
        setRowInputs(current => { const next = { ...current }; targets.forEach(item => { next[item.key] = { excluded: false, stock: item.stock, reorder: commonReorder }; }); return next; });
        setApplyError(''); setApplyNotice(`등록 대상 ${targets.length}개에 기준 ${Number(commonReorder)}개를 적용했습니다.`);
      }}>부족 표시 기준 일괄 적용</button>
      {applyError && <p role="alert" className="admin-session-error">{applyError}</p>}
      <p role="status">{applyNotice}</p>
    </section>

        <section className="catalog-batch-preview" aria-label="등록할 옵션과 초기 재고">
          <h3>등록할 옵션과 초기 재고</h3>
          <p aria-live="polite">총 {total}개 · 등록 대상 {targets.length}개 · 제외 {excludedCount}개 · 기존 {existingCount}개</p>
          <p aria-live="polite">초기 입고 합계: {validStocks ? `${stockTotal}개` : '수량 입력 확인 필요'}</p>
          <p className="catalog-note">색상·사이즈 각각 최대 50개, 총 200개까지입니다. 제외한 행은 등록하지 않습니다. 기존 옵션의 재고는 재고 관리에서 변경하세요.</p>
          {overLimit ? <p role="alert">등록 가능한 개수를 초과했습니다. 선택을 줄여 주세요.</p> : !selectedProduct ? <p>대상 상품을 선택해 주세요.</p> : !!combinations.length && <div className="catalog-table-scroll" tabIndex={0} role="region" aria-label="선택 조합 목록">
            <table><thead><tr><th>색상</th><th>사이즈</th><th>옵션 관리 코드</th><th>등록 구분</th><th>초기 입고 수량 / 현재 재고</th><th>재고 부족 표시 기준</th><th>등록 대상 관리</th></tr></thead><tbody>{combinations.map(item => <tr key={item.key} data-combination-key={item.key} className={item.excluded && !item.existing ? 'catalog-batch-excluded' : undefined}>
              <td>{item.color.name}</td><td>{item.size.name}</td><td>{item.code}</td><td>{item.existing ? '기존 등록' : item.excluded ? '제외' : '등록 대상'}</td>
              <td>{item.existing ? <span>현재 재고 {item.existing.on_hand}개</span> : <><label className="catalog-stock-label" htmlFor={`initial-stock-${item.key}`}>{item.color.name} / {item.size.name} 초기 입고 수량</label><input id={`initial-stock-${item.key}`} className="catalog-initial-stock" type="number" min={0} max={1000000} step={1} required={!item.excluded} disabled={item.excluded} value={item.stock} onChange={event => setRowInputs(current => ({ ...current, [item.key]: { excluded: item.excluded, stock: event.target.value, reorder: item.reorder } }))} /></>}</td>
              <td>{item.existing ? <span>현재 기준 {item.existing.reorder_point}개</span> : <><label className="catalog-stock-label" htmlFor={`reorder-point-${item.key}`}>{item.color.name} / {item.size.name} 재고 부족 표시 기준</label><input id={`reorder-point-${item.key}`} className="catalog-initial-stock" type="number" min={0} max={1000000} step={1} required={!item.excluded} disabled={item.excluded} value={item.reorder} onChange={event => setRowInputs(current => ({ ...current, [item.key]: { excluded: item.excluded, stock: item.stock, reorder: event.target.value } }))} /></>}</td>
              <td>{item.existing ? <Link className="catalog-link-button" href={`/admin/catalog/options/${encodeURIComponent(item.existing.id)}/edit`}>옵션 수정</Link> : <button type="button" aria-label={`${item.color.name} / ${item.size.name} ${item.excluded ? '복원' : '제외'}`} onClick={() => setRowInputs(current => ({ ...current, [item.key]: { stock: item.stock, reorder: item.reorder, excluded: !item.excluded } }))}>{item.excluded ? '복원' : '제외'}</button>}</td>
            </tr>)}</tbody></table>
          </div>}
          {!overLimit && selectedProduct && !targets.length && <p role="status">저장할 신규 조합이 없습니다. 색상과 사이즈를 선택하거나 제외한 조합을 복원해 주세요. 기존 옵션 수정은 상품 상세의 색상·사이즈 현황에서 진행합니다.</p>}
        </section>
        <div className="catalog-actions"><button className="catalog-primary" type="submit" disabled={overLimit || !targets.length}>{op.busy ? '등록 중…' : '선택 조합 등록·저장'}</button><Link className="catalog-link-button ds-form-action" href={option.product_id?`/admin/catalog/${encodeURIComponent(option.product_id)}`:"/admin/catalog"}>{option.product_id?'취소하고 상품 상세로':'취소하고 목록으로'}</Link></div>
      </fieldset>
    </form>
    <div className="catalog-quick-options"><div className="catalog-actions">
      <button id="quick-color-toggle" type="button" disabled={disabled} aria-expanded={quickKind === 'color'} aria-controls="quick-option-panel" onClick={() => setQuickKind(quickKind === 'color' ? null : 'color')}>색상 빠른 추가</button>
      <button id="quick-size-toggle" type="button" disabled={disabled} aria-expanded={quickKind === 'size'} aria-controls="quick-option-panel" onClick={() => setQuickKind(quickKind === 'size' ? null : 'size')}>사이즈 빠른 추가</button>
    </div>{quickKind && <section id="quick-option-panel" className="catalog-quick-panel" aria-label={`${quickKind === 'color' ? '색상' : '사이즈'} 빠른 추가`}>
      <h3>{quickKind === 'color' ? '색상' : '사이즈'} 빠른 추가</h3><p className="catalog-note">저장한 항목은 기존 선택에 추가됩니다.</p>
      <OptionValueForm key={quickKind} kind={quickKind} idPrefix={`quick-${quickKind}`} activeOnly refresh={refresh} onBusyChange={setQuickBusy} onCancel={() => { pendingFocus.current = `quick-${quickKind}-toggle`; setQuickKind(null); }} onSaved={async value => {
        setCreatedValues(current => [...current.filter(item => item.id !== value.id), value]);
        const key = value.kind === 'color' ? 'color_ids' : 'size_ids';
        setOption(current => ({ ...current, [key]: [...new Set([...current[key], value.id])] }));
        await refresh(); pendingFocus.current = `batch-${value.kind}-${value.id}`; setQuickKind(null);
      }} />
    </section>}</div>
  </section>;
}
export function InventoryForm({ catalog, refresh, initialFlow = '', productId = '' }: { catalog: Catalog; refresh: Refresh; initialFlow?: string; productId?: string }) {
  const router = useRouter();
  const [savedId, setSavedId] = useState('');
  const scopedSkus=productId?catalog.skus.filter(sku=>sku.product_id===productId):catalog.skus;
  const [confirmed,setConfirmed]=useState<{result:ReturnType<typeof parseMovementConfirmation>;productId:string;productName:string;color:string;size:string}|null>(null);
  const [supplierId,setSupplierId]=useState('');
  const suppliers=(catalog.suppliers||[]).filter(s=>s.is_active);
  const initial = inventoryFlowConfig(initialFlow);
  const [movement, setMovement] = useState({ sku_id: productId?(scopedSkus[0]?.id||''):'', delta: '', reason: '', reason_code: initial.reason });
  const [flow, setFlow] = useState(initial.flow);
  const flowTitle = inventoryFlows.find(item=>item.value===flow)?.title || '';
  const quantityLabel = flow === 'receipt' ? '입고 수량' : flow === 'out' ? '출고 수량' : '조정 수량';
  const reasonOptions = inventoryFlowReasons(flow);
  const reasonReady = reasonOptions.includes(movement.reason_code);
  const pending = useRef<MovementRequest | null>(null);
  const [retry,setRetry]=useState<MovementRequest|null>(null);
  const completedGuard = useRef(false);
  const op = useOperation();
  const selected = scopedSkus.find(option => option.id === movement.sku_id);
  const selectedProduct = catalog.products.find(product => product.id === selected?.product_id);
  const signedDelta = inventorySignedDelta(movement.reason_code,Number(movement.delta));
  const validQuantity = Number.isInteger(Number(movement.delta)) && Number(movement.delta) >= 1 && Number(movement.delta) <= 1000000;
  const expectedStock = selected && validQuantity ? selected.on_hand + signedDelta : null;
  const samePending = retry && retry.sku_id===movement.sku_id && retry.delta===signedDelta && retry.reason===movement.reason.trim() && retry.reason_code===movement.reason_code && (retry.supplier_id??null)===(flow==='receipt'?supplierId:null);
  const supplierReady = flow!=='receipt' || suppliers.some(s=>s.id===supplierId) || !!samePending;
  const supplierOptions = suppliers.map(s=>({value:s.id,label:s.name}));
  if(supplierId&&!suppliers.some(s=>s.id===supplierId))supplierOptions.push({value:supplierId,label:(catalog.suppliers?.find(s=>s.id===supplierId)?.name||'기존 선택 입고처')+' (사용 중지 · 새 입고 불가)'});


  function save(event: FormEvent) {
    event.preventDefault();
    if (!flow || !reasonReady || !selected || completedGuard.current || !validQuantity || !supplierReady) return;
    void op.run(async () => {
      pending.current = movementRequest(pending.current, {
        supplier_id:flow==='receipt'?supplierId:null, sku_id: movement.sku_id, delta: signedDelta, reason: movement.reason, reason_code: movement.reason_code,
      }, selected.version, () => crypto.randomUUID());
      const request = pending.current;
      setRetry(request);
      const result = await catalogRequest('/api/admin/inventory/movements', raw => parseMovementConfirmation(raw, request), { method: 'POST', body: request });
      if (!result.ok) { op.setFailure(result.reason); return; }
      pending.current = null; setRetry(null);
      completedGuard.current = true;
      setSavedId(result.data.id);
      if(productId)setConfirmed({result:result.data,productId:selected.product_id,productName:selectedProduct?.name||'등록 상품',color:selected.color,size:selected.size});
      else router.replace('/admin/catalog/inventory?saved=' + encodeURIComponent(result.data.id));
    });
  }

  if(confirmed)return <SaveResult className="catalog-panel" title="재고 변경이 완료되었습니다" actions={<><Link className="catalog-link-button catalog-primary" href={`/admin/catalog/${encodeURIComponent(confirmed.productId)}`}>상품 상세로</Link><Link className="catalog-link-button" href={`/admin/catalog/inventory?product_id=${encodeURIComponent(confirmed.productId)}&saved=${encodeURIComponent(confirmed.result.id)}`}>재고 변경 이력 확인</Link></>}><p>{confirmed.productName} · {confirmed.color} / {confirmed.size}</p><KeyFacts label="확정 재고 변경" items={[{label:movementReasonLabels[confirmed.result.reason_code??'legacy'],value:`${confirmed.result.delta>0?'+':''}${confirmed.result.delta}개`},{label:'실제 재고',previous:`${confirmed.result.balance_after-confirmed.result.delta}개`,value:`${confirmed.result.balance_after}개`}]}/><p>서버에서 확정된 재고 변경 기록입니다.</p></SaveResult>;
  if (savedId) return <section className="catalog-panel" aria-busy="true">
    <p role="status">기록을 확인했습니다. 재고 변경 이력으로 이동 중입니다.</p>
    <Link className="catalog-link-button" href={`/admin/catalog/inventory?saved=${encodeURIComponent(savedId)}`}>재고 변경 이력으로 이동</Link>
  </section>;
  return <section className="catalog-panel catalog-form-panel catalog-form-wide catalog-inventory-form">
    {productId&&!catalog.products.some(product=>product.id===productId)&&<p role="alert">해당 상품을 찾을 수 없습니다. 상품 목록에서 다시 선택해 주세요.</p>}
    <div className="catalog-flow-cards" role="group" aria-label="재고 업무 선택">
      {inventoryFlows.map(({value, title, description}) => <button type="button" key={value} disabled={op.busy} aria-pressed={flow === value} onClick={() => {
        if (flow !== value) { setFlow(value); setMovement(current => ({ ...current, reason_code: inventoryFlowConfig(value).reason })); }
      }}><strong>{title}</strong><span>{description}</span></button>)}
    </div>
    <div className="catalog-movement-intro">
    <div className="catalog-tool-heading"><h2>{flow ? flowTitle : '처리할 재고 업무를 선택하세요'}</h2><Tooltip label="재고 기록 도움말" trigger={<span className="catalog-help-icon" aria-hidden="true">?</span>}><p>재고 변경은 공용 로컬 관리자 명의로 기록됩니다. 입고는 선택한 공장·공급처와 연결됩니다. 공급처명은 입고 당시 이름으로 기록됩니다. 고객 판매 출고는 재고 기록이며 주문·결제·배송과 연결되지 않습니다. 저장 결과가 불확실하면 동일한 입력으로 다시 시도하세요. 새로고침하거나 화면을 나간 뒤에는 이력에서 저장 여부를 먼저 확인하세요.</p></Tooltip></div>
    <p className="catalog-note">{flow ? '수량은 양수로 입력하세요. 업무를 바꿔도 선택한 옵션·수량·메모는 유지됩니다.' : '위에서 업무를 선택하면 입력 화면이 열립니다.'}</p>

    {!scopedSkus.length && <p>먼저 상품의 <Link href={`/admin/catalog/options/new${productId?'?product_id='+encodeURIComponent(productId):''}`}>색상·사이즈를 등록해 주세요.</Link></p>}
    <Feedback failure={op.failure} notice={op.notice} />
    <div className="catalog-actions"><Link className="catalog-link-button" href={`/admin/catalog/inventory${productId?'?product_id='+encodeURIComponent(productId):''}`}>재고 변경 이력 확인</Link></div>
    {op.failure === 'unavailable' && <p role="status" className="catalog-notice">저장 결과가 불확실합니다. 같은 업무·사유·수량·메모로 다시 시도하세요. 화면을 나가거나 새로고침했다면 재입력 전에 이력을 확인하세요.</p>}
    </div>
    {flow && <form id="movement-form" className="ds-form" onSubmit={save}>
      <FormRequiredHint />
      <fieldset disabled={op.busy || !scopedSkus.length} className="catalog-form-grid">
        {(flow === 'out' || flow === 'adjust') && <div className="catalog-field catalog-field-wide"><FormLabel htmlFor="movement-reason-code" required>{flow==='out'?'출고 사유':'조정 방향'}</FormLabel><FormSelect id="movement-reason-code" required disabled={op.busy} value={movement.reason_code} onChange={value => setMovement({ ...movement, reason_code: value as MovementReasonCode })} options={reasonOptions.map(code => ({ value: code, label: movementReasonLabels[code] }))} /></div>}
        {flow==='receipt'&&<div className="catalog-field catalog-field-wide catalog-supplier-field"><FormLabel htmlFor="movement-supplier" required>공장·공급처</FormLabel><FormSelect id="movement-supplier" required value={supplierId} onChange={setSupplierId} placeholder="입고처 선택" options={supplierOptions}/><div className="catalog-actions"><Link className="catalog-link-button ds-form-action" href="/admin/catalog/suppliers/new" target="_blank" rel="noopener noreferrer">공장·공급처 등록 (새 탭)</Link><button type="button" onClick={()=>void op.run(async()=>{await refresh()})}>공급처 새로고침</button></div>{!suppliers.length&&<p role="status">사용 중인 공장·공급처를 먼저 등록해 주세요.</p>}</div>}
        <div className="catalog-field">
        <FormLabel htmlFor="movement-option" required>색상·사이즈 선택</FormLabel>
        <FormSelect id="movement-option" describedBy={selected ? "movement-option-detail" : undefined} required disabled={op.busy || !scopedSkus.length} value={movement.sku_id} placeholder="색상·사이즈 선택"
          onChange={value => setMovement({ ...movement, sku_id: value })}
          options={scopedSkus.map(option => {
            const product = catalog.products.find(item => item.id === option.product_id);
            return { value: option.id, label: `${product?.internal_name} · ${product?.name} · ${option.color} / ${option.size} · ${option.code}` };
          })} />
        </div>
        
        <div className="catalog-field">
        <FormLabel htmlFor="movement-delta" required>{quantityLabel}</FormLabel>
        <input id="movement-delta" aria-labelledby="movement-delta-label" type="number" required min={1} max={1000000} step={1} value={movement.delta} onChange={event => setMovement({ ...movement, delta: event.target.value })} />
        </div>
        {selected && <dl id="movement-option-detail" className="catalog-selected-option" aria-label="선택한 상품과 옵션 전체 정보">
          <div><dt>상품명</dt><dd>{selectedProduct?.name || '상품 정보 없음'}</dd></div>
          <div><dt>내부 관리명</dt><dd>{selectedProduct?.internal_name || '—'}</dd></div>
          <div><dt>색상 · 사이즈</dt><dd>{selected.color} / {selected.size}</dd></div>
          <div><dt>옵션 관리 코드</dt><dd>{selected.code}</dd></div>
        </dl>}
        {selected && <div className="catalog-key-summary" aria-live="polite"><KeyFacts label="재고 변경 미리보기" items={[{label:'현재 실제 재고',value:`${selected.on_hand}개`},{label:'입력한 증감',value:validQuantity?`${signedDelta>0?'+':''}${signedDelta}개`:'수량 입력'},{label:'예상 변경 후 재고',value:expectedStock===null?'—':`${expectedStock}개`,note:'최종 재고는 저장 시 서버에서 확인합니다.'}]}/></div>}
        {expectedStock !== null && expectedStock < 0 && <p role="status" className="admin-session-error">재고가 부족합니다. 수량을 확인하세요.</p>}
        <div className="catalog-field catalog-field-wide">
        <FormLabel htmlFor="movement-reason" hint="선택">상세 사유</FormLabel>
        <textarea id="movement-reason" aria-labelledby="movement-reason-label" maxLength={300} rows={3} value={movement.reason} onChange={event => setMovement({ ...movement, reason: event.target.value })} />
        </div>
        <div className="catalog-actions">
          <button className="catalog-primary" type="submit" disabled={!selected || !validQuantity || !supplierReady || !reasonReady}>{op.busy ? '기록 중…' : flow === 'receipt' ? '입고 기록' : flow === 'out' ? '출고 기록' : '조정 기록'}</button>
          {productId&&<Link className="catalog-link-button" href={`/admin/catalog/${encodeURIComponent(productId)}`}>취소하고 상품 상세로</Link>}
          <button type="button" onClick={() => void op.run(async () => { await refresh(); })}>현재 재고 새로고침</button>
          {op.failure === 'conflict' && <button type="button" onClick={() => void op.run(async () => {
            if (await refresh()) {
              pending.current = null; setRetry(null);
              op.setNotice('최신 재고를 불러왔습니다. 수량과 사유를 확인한 뒤 새 요청으로 기록해 주세요.');
            }
          })}>최신 재고로 새 요청 준비</button>}
        </div>
      </fieldset>
    </form>}
  </section>;
}
















