import type {Supplier, SupplierDetails} from './catalog.ts';

export function supplierPhoneError(value: string): string {
  const phone = value.trim();
  if (!phone) return '';
  if (!/^\+?[0-9(). -]+$/.test(phone) || !/[0-9]/.test(phone)) return '숫자와 공백, 괄호, 점, 하이픈을 사용해 주세요. 국제번호의 +는 맨 앞에 한 번만 입력합니다.';
  const max = phone.startsWith('+') ? 15 : 11;
  if (phone.replace(/[^0-9]/g, '').length > max) return phone.startsWith('+') ? '국제번호는 국가번호를 포함해 숫자 최대 15자리입니다.' : '국내 전화번호는 숫자 최대 11자리입니다. 해외 번호는 +국가번호로 시작해 주세요.';
  if (phone.length > 40) return '전화번호는 구분기호를 포함해 40자 이내로 입력해 주세요.';
  return '';
}

/** Input-time guard: reject the whole edit rather than silently saving a truncated number. */
export function editSupplierPhone(previous: string, proposed: string): {value: string; error: string} {
  const phone = proposed.trim();
  const digitCount = phone.replace(/[^0-9]/g, '').length;
  const max = phone.startsWith('+') ? 15 : 11;
  const validEdit = /^\+?[0-9(). -]*$/.test(phone) && digitCount <= max && phone.length <= 40;
  // Legacy values remain visible; allow deletion only (no added/reordered characters) toward correction.
  let cursor = 0;
  for (const character of previous) if (character === proposed[cursor]) cursor += 1;
  const legacyDeletion = !!supplierPhoneError(previous) && proposed.length < previous.length && cursor === proposed.length;
  if (validEdit || legacyDeletion) return {value: proposed, error: ''};
  return {value: previous, error: `${supplierPhoneError(proposed)} 입력을 반영하지 않았습니다. 번호를 수정하거나 현재 표시된 값을 확인해 주세요.`};
}

export function supplierDetailsForSave(details: SupplierDetails, initial?: Supplier): Partial<SupplierDetails> {
  const payload: Partial<SupplierDetails> = {...details};
  for (const key of ['phone', 'contact_phone'] as const) if (initial && details[key] === initial[key]) delete payload[key];
  return payload;
}

export function findSavedSupplier(suppliers: Supplier[], id: string, version: string): Supplier | undefined {
  if (!id || !/^(0|[1-9][0-9]*)$/.test(version) || !Number.isSafeInteger(Number(version))) return undefined;
  return suppliers.find(row => row.id === id && row.version >= Number(version));
}

// In-memory evidence comes only from a validated save response; URL values alone are not evidence.
type SupplierSaveReceipt = Pick<Supplier, 'id' | 'version' | 'name' | 'is_active'>;
let receipt: SupplierSaveReceipt | null = null;
export function rememberSupplierSave({id,version,name,is_active}: Supplier) { receipt = {id,version,name,is_active}; }
export function supplierSaveReceipt(id: string, version: string): SupplierSaveReceipt | null {
  return receipt?.id === id && String(receipt.version) === version ? receipt : null;
}
