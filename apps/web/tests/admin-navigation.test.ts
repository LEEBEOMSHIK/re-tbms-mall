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

test('site content routes share the site management navigation',()=>{
 for(const path of ['/admin/site','/admin/brand-about','/admin/brand-about/edit','/admin/brand-about/preview'])assert.equal(adminSection(path),'/admin/site');
 assert.equal(adminSection('/admin/brand-about-other'),'');
});

test('merchandising list and editors activate site management',()=>{
 for(const path of ['/admin/merchandising','/admin/merchandising/new','/admin/merchandising/example/edit']) assert.equal(adminSection(path),'/admin/site');
 assert.equal(adminSection('/admin/merchandising-other'),'');
});

test('sales order detail stays within orders navigation',()=>{assert.equal(adminSection('/admin/orders'),'/admin/orders');assert.equal(adminSection('/admin/orders/example'),'/admin/orders');assert.notEqual(adminSection('/admin/orders-other'),'/admin/orders');});
test('carrier preparation activates its own project menu',()=>{assert.equal(adminSection('/admin/carrier-preparation'),'/admin/carrier-preparation');assert.equal(adminSection('/admin/carrier-preparation-other'),'');});

test('design system belongs to its own menu',()=>{
 assert.equal(adminSection('/admin/design-system'),'/admin/design-system');
 assert.equal(adminSection('/admin/design-system-other'),'');
});
