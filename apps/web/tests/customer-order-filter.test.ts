import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customerOrderFilter} from '../src/lib/customer-order-filter.ts';
test('customer status filters exclude terminal orders from shipping and payment stages',()=>{
 assert.deepEqual(customerOrderFilter('preparing',''),{status:'confirmed',payment_status:'succeeded',fulfillment_status:'preparing'});
 assert.deepEqual(customerOrderFilter('unknown',''),{status:'awaiting_payment',payment_status:'unknown'});
 assert.deepEqual(customerOrderFilter('expired',''),{status:'expired'});
 assert.deepEqual(customerOrderFilter('',''),{});
});
test('period uses Korean calendar date and clamps end-of-month',()=>{
 assert.deepEqual(customerOrderFilter('','1',new Date('2026-03-30T15:00:00Z')),{date_to:'2026-03-31',date_from:'2026-02-28'});
 assert.equal(customerOrderFilter('','12',new Date('2024-02-29T00:00:00Z')).date_from,'2023-02-28');
});
