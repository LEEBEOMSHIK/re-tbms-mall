import test from 'node:test';
import assert from 'node:assert/strict';
import {supplierPhoneError,editSupplierPhone,supplierDetailsForSave,findSavedSupplier,rememberSupplierSave,supplierSaveReceipt} from '../src/lib/supplier-form.ts';
import {parseSupplier} from '../src/lib/catalog.ts';
test('phone validates digit limits without truncating or rejecting landlines',()=>{
 for(const phone of ['', ' ', '02-000-0000', '010-0000-0000', '+123456789012345']) assert.equal(supplierPhoneError(phone),'');
 for(const phone of ['010000000000', '+1234567890123456','++123','12+34','abc','---','+','１２３']) assert.notEqual(supplierPhoneError(phone),'');
});
test('unchanged legacy phones omitted while edited and cleared numbers stay explicit',()=>{
 const initial=parseSupplier({id:'v',name:'Factory',version:0,is_active:true,phone:'123456789012',contact_phone:'02-000-0000'});
 const details={...initial};
 const payload=supplierDetailsForSave(details,initial);
 assert.equal(Object.hasOwn(payload,'phone'),false);assert.equal(Object.hasOwn(payload,'contact_phone'),false);
 assert.equal(supplierDetailsForSave({...details,phone:''},initial).phone,'');
 assert.equal(supplierDetailsForSave({...details,phone:'010-0000-0000'},initial).phone,'010-0000-0000');
 assert.equal(supplierDetailsForSave(details).phone,initial.phone);
});
test('save result requires persisted version and receipt follows validated save',()=>{
 const supplier=parseSupplier({id:'v',name:'Factory',version:2,is_active:true});
 for(const [id,version] of [['v','3'],['missing','2'],['v',''],['v','-1'],['v','2oops']]) assert.equal(findSavedSupplier([supplier],id,version),undefined);
 assert.equal(findSavedSupplier([supplier],'v','2'),supplier);
 assert.equal(findSavedSupplier([supplier],'v','1'),supplier);
 assert.equal(supplierSaveReceipt('v','2'),null);rememberSupplierSave(supplier);
 assert.deepEqual(supplierSaveReceipt('v','2'),{id:'v',name:'Factory',version:2,is_active:true});assert.equal(supplierSaveReceipt('v','1'),null);
});

test('phone editing rejects entire overflow and illegal paste while retaining prior value',()=>{
 const local='01000000000';
 for(const proposed of [local+'1','010-0000-00001','abc','12+34','++12','+1234567890123456']) {
  const result=editSupplierPhone(local,proposed);
  assert.equal(result.value,local);assert.notEqual(result.error,'');
 }
 assert.deepEqual(editSupplierPhone('','+'),{value:'+',error:''});
 assert.deepEqual(editSupplierPhone('+','+12'),{value:'+12',error:''});
 assert.deepEqual(editSupplierPhone(local,'010-0000-0000'),{value:'010-0000-0000',error:''});
 assert.deepEqual(editSupplierPhone(local,''),{value:'',error:''});
 assert.deepEqual(editSupplierPhone('','('),{value:'(',error:''});
 assert.notEqual(supplierPhoneError('+'),'');
 assert.notEqual(supplierPhoneError('('),'');
});
test('legacy phone supports incremental deletion but cannot grow or mutate into another invalid value',()=>{
 const legacy='12345678901234567890';
 const reduced=editSupplierPhone(legacy,legacy.slice(0,-1));
 assert.equal(reduced.value,legacy.slice(0,-1));assert.equal(reduced.error,'');
 assert.notEqual(supplierPhoneError(reduced.value),'');
 assert.equal(editSupplierPhone(legacy,legacy+'1').value,legacy);
 assert.equal(editSupplierPhone(legacy,'9999999999999').value,legacy);
 assert.equal(editSupplierPhone(legacy,'01000000000').value,'01000000000');
 const international='+123456789012';
 assert.equal(editSupplierPhone(international,international.slice(1)).value,international);
});
