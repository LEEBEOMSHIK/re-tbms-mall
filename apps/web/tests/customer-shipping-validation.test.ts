import test from 'node:test';
import assert from 'node:assert/strict';
import {shippingFieldError,phoneDigits,pastePhoneDigits,type Shipping} from '../src/lib/customer-checkout.ts';
test('phone typing and formatted paste retain at most eleven digits',()=>{
 assert.equal(phoneDigits('010-1234-5678'),'01012345678');
 assert.equal(phoneDigits('010123456789999'),'01012345678');
 assert.equal(phoneDigits('abc010 1234 5678'),'01012345678');
 assert.notEqual(shippingFieldError('phone','010123456789'),'');
 assert.notEqual(shippingFieldError('phone','123'),'');
 assert.equal(pastePhoneDigits('01012345678','999999',3,7),'01099995678');
 assert.equal(pastePhoneDigits('01012345678','010-9876-5432',0,11),'01098765432');
});
test('shipping requires nonblank fields including detail; memo remains optional',()=>{
 for(const key of ['recipient','phone','postal_code','address','address_detail'] as (keyof Shipping)[]){
  assert.notEqual(shippingFieldError(key,''),'');assert.notEqual(shippingFieldError(key,'   '),'');
 }
 assert.equal(shippingFieldError('memo',''),'');
 assert.equal(shippingFieldError('address_detail',' 101동 202호 '),'');
 assert.notEqual(shippingFieldError('address_detail','x'.repeat(101)),'');
});
test('shipping rejects malformed phone, postcode and short address',()=>{
 assert.equal(shippingFieldError('phone','010-1234-5678'),'');
 assert.notEqual(shippingFieldError('phone','abc'),'');
 assert.notEqual(shippingFieldError('postal_code','1234'),'');
 assert.equal(shippingFieldError('postal_code','04524'),'');
 assert.notEqual(shippingFieldError('address','서울'),'');
 assert.notEqual(shippingFieldError('recipient','이름\n'),'');
});
