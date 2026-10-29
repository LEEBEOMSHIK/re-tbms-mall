'use client';

import { useEffect, useRef, useState } from 'react';
import { FormLabel, FormSelect } from '@/components/ui/form-controls';
import { KoreanAddressSearch } from '@/components/korean-address-search';
import { supplierDetailLimits, type SupplierDetails } from '@/lib/catalog';

export function supplierCountryName(code: string) {
  if (!code) return '미지정';
  try { return new Intl.DisplayNames(['ko'], { type: 'region' }).of(code) || code; }
  catch { return code; }
}

export function SupplierAddress({ value, countryCodes, disabled, onChange }: {
  value: SupplierDetails; countryCodes: string[]; disabled: boolean; onChange: (patch: Partial<SupplierDetails>) => void;
}) {
  const [notice, setNotice] = useState('');
  const detail = useRef<HTMLInputElement>(null);
  const currentCountry = useRef(value.country_code);
  useEffect(() => { currentCountry.current = value.country_code; }, [value.country_code]);
  const options = countryCodes.map(code => ({ value: code, label: `${supplierCountryName(code)} (${code})` })).sort((a, b) => a.value === 'KR' ? -1 : b.value === 'KR' ? 1 : a.label.localeCompare(b.label, 'ko'));
  if (value.country_code && !countryCodes.includes(value.country_code)) options.unshift({ value: value.country_code, label: `${supplierCountryName(value.country_code)} (${value.country_code})` });
  const foreign = !!value.country_code && value.country_code !== 'KR';
  const fields: { key: 'region' | 'city' | 'postal_code' | 'address' | 'address_detail'; label: string }[] = [
    { key: 'region', label: foreign ? '주·도·지역 (State / Province)' : '시·도 / 지역' },
    { key: 'city', label: foreign ? '도시 (City)' : '시·군·구 / 도시' },
    { key: 'postal_code', label: '우편번호' },
    { key: 'address', label: foreign ? '주소 1 (Address line 1)' : '주소' },
    { key: 'address_detail', label: foreign ? '주소 2 (Address line 2)' : '상세 주소' },
  ];
  return <section className="supplier-form-group" aria-labelledby="supplier-address-title">
    <h2 id="supplier-address-title">주소</h2>
    <div className="supplier-field-grid">
      <div className="supplier-field supplier-field-wide"><FormLabel htmlFor="supplier-country_code" hint="선택">국가</FormLabel>
        <FormSelect id="supplier-country_code" disabled={disabled || !countryCodes.length} value={value.country_code} options={[{ value: '', label: '미지정' }, ...options]} onChange={country_code => { currentCountry.current = country_code; onChange({ country_code }); setNotice('국가를 변경했습니다. 입력한 주소·우편번호·상세 주소는 유지됩니다. 국가에 맞는지 확인해 주세요.'); }} />
      </div>
      <div className="supplier-field-wide supplier-address-help">
        {!countryCodes.length && <p role="status">국가 목록을 불러오지 못했습니다. 기존 국가와 주소는 유지되며 주소를 직접 입력할 수 있습니다.</p>}
        <p className="catalog-note">{value.country_code === 'KR' ? '국내 주소를 검색하거나 아래에 직접 입력하세요. 검색 결과를 선택하면 우편번호와 주소만 변경됩니다.' : foreign ? '해외 주소는 아래에 직접 입력하세요.' : '국가를 선택하면 국내 주소 검색을 사용할 수 있습니다. 국가 미지정 상태에서도 직접 입력할 수 있습니다.'}</p>
        {value.country_code === 'KR' && <KoreanAddressSearch disabled={disabled} onSelect={address => {
          if (currentCountry.current !== 'KR') return;
          onChange({ postal_code: address.postal_code, address: address.address });
          setNotice('선택한 우편번호와 주소를 반영했습니다. 상세 주소·지역·도시는 유지됩니다. 상세 주소를 확인해 주세요.');
          detail.current?.focus();
        }} />}
      </div>
      {fields.map(field => <div key={field.key} className={`supplier-field${field.key === 'address' || field.key === 'address_detail' ? ' supplier-field-wide' : ''}`}>
        <FormLabel htmlFor={`supplier-${field.key}`} hint="선택">{field.label}</FormLabel>
        <input ref={field.key === 'address_detail' ? detail : undefined} id={`supplier-${field.key}`} aria-labelledby={`supplier-${field.key}-label`} disabled={disabled} maxLength={supplierDetailLimits[field.key]} value={value[field.key]} onChange={event => onChange({ [field.key]: event.target.value })} />
      </div>)}
    </div>
    <p role="status" className="supplier-address-notice">{notice}</p>
  </section>;
}
