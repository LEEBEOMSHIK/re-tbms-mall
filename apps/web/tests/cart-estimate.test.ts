import test from 'node:test';
import assert from 'node:assert/strict';
import {cartEstimate, previewQuantities} from '../src/lib/cart-selection.ts';
import type {CartItem} from '../src/lib/customer-shopping.ts';

const offer:CartItem={sku_id:'A', product_id:'P', name:'셔츠', color:'Red', size:'S', quantity:1,
  price:30000, discount_price:25000, effective_price:25000, image:null,
  available_quantity:2, available:true, unavailable_reason:null, line_total:25000};
const policy={base_fee:3000,free_threshold:50000};

test('discounted subtotal controls shipping and preview uses the same quantities as rows',()=>{
  const before=[offer];
  assert.deepEqual(cartEstimate(before,policy),{original:30000,discount:5000,subtotal:25000,shipping:3000,estimated:28000});
  const projected=previewQuantities(before,new Map([['A',2]]));
  assert.deepEqual(cartEstimate(projected,policy),{original:60000,discount:10000,subtotal:50000,shipping:0,estimated:50000});
  assert.equal(before[0].quantity,1);
  assert.deepEqual(previewQuantities(before,new Map([['A',3]])),before);
});
test('unavailable items do not contribute to any sum and absent policies never imply free shipping',()=>{
  const unavailable={...offer,sku_id:'B',available:false,line_total:null};
  assert.equal(cartEstimate([unavailable],policy).estimated,0);
  assert.deepEqual(cartEstimate([offer,unavailable],policy),cartEstimate([offer],policy));
  assert.equal(cartEstimate([offer]).estimated,null);
});
test('pending quantities on two SKUs contribute together without modifying the confirmed cart',()=>{
  const items=[offer,{...offer,sku_id:'B',available_quantity:3}];
  const targets=new Map([['A',2],['B',3]]);
  const preview=previewQuantities(items,targets);
  assert.deepEqual(preview.map(row=>row.quantity),[2,3]);
  assert.equal(cartEstimate(preview,policy).estimated,125000);
  assert.deepEqual(items.map(row=>row.quantity),[1,1]);
});
