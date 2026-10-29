import test from 'node:test';
import assert from 'node:assert/strict';
import {adminSection} from '../src/lib/admin-navigation.ts';
test('product and inventory navigation stay exclusive across nested routes',()=>{
 for(const path of ['/admin/catalog','/admin/catalog/new','/admin/catalog/product-id/edit','/admin/catalog/categories/new','/admin/catalog/options/new']) assert.equal(adminSection(path),'/admin/catalog');
 for(const path of ['/admin/shipments','/admin/shipments/id/receive','/admin/catalog/inventory','/admin/catalog/inventory/new','/admin/catalog/suppliers','/admin/catalog/suppliers/new','/admin/catalog/suppliers/id/edit']) assert.equal(adminSection(path),'/admin/catalog/inventory');
 assert.equal(adminSection('/admin/catalog/inventory-other'),'/admin/catalog');
 assert.equal(adminSection('/admin/catalogue'),'');
 assert.equal(adminSection('/admin'),'/admin');
});
