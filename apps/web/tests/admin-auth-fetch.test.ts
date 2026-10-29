import test from 'node:test';
import assert from 'node:assert/strict';
import {isAdminUnauthorized} from '../src/lib/admin-auth-fetch.ts';
test('only same-origin protected administrator 401 expires the administrator',()=>{
 const origin='http://127.0.0.1:3100';
 for(const path of ['/api/admin/inventory/overview','/api/admin/designs/one','/api/admin/shipments'])assert.equal(isAdminUnauthorized(path,401,origin),true);
 for(const path of ['/api/factory/profile','/api/shop/products','/api/admin/session','https://foreign.example/api/admin/designs'])assert.equal(isAdminUnauthorized(path,401,origin),false);
 for(const status of [200,403,404,409,422,500,503])assert.equal(isAdminUnauthorized('/api/admin/designs',status,origin),false);
 assert.equal(isAdminUnauthorized(new Request(origin+'/api/admin/designs'),401,origin),true);
});
