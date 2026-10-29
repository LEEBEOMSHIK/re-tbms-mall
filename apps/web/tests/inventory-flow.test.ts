import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryFlowConfig,inventoryFlowReasons,inventorySignedDelta} from '../src/lib/inventory-flow.ts';
test('inventory entry routes preserve old links and assign reason within the selected flow',()=>{
 assert.deepEqual(inventoryFlowConfig('receipt'),{flow:'receipt',reason:'receipt'});
 assert.deepEqual(inventoryFlowConfig('out'),{flow:'out',reason:'sale'});
 assert.deepEqual(inventoryFlowConfig('adjust'),{flow:'adjust',reason:'adjust_in'});
 assert.deepEqual(inventoryFlowConfig('customer'),{flow:'out',reason:'sale'});
 assert.deepEqual(inventoryFlowConfig('other'),{flow:'out',reason:'gift'});
 for(const value of ['receipt','out','adjust','customer','other']){
  const config=inventoryFlowConfig(value);assert.ok(inventoryFlowReasons(config.flow).includes(config.reason));
 }
 for(const value of ['', 'unknown']) assert.equal(inventoryFlowConfig(value).flow,'');
});
test('outbound reasons cannot increase inventory and adjustment reasons remain separate',()=>{
 assert.deepEqual(inventoryFlowReasons('out'),['sale','gift','disposal','other_out']);
 assert.deepEqual(inventoryFlowReasons('adjust'),['adjust_in','adjust_out']);
 assert.deepEqual(inventoryFlowReasons('receipt'),['receipt']);
 assert.deepEqual(inventoryFlowReasons(''),[]);
 for(const quantity of [1,1000000]) {
  for(const reason of inventoryFlowReasons('out'))assert.equal(inventorySignedDelta(reason,quantity),-quantity);
  assert.equal(inventorySignedDelta('receipt',quantity),quantity);
  assert.equal(inventorySignedDelta('adjust_in',quantity),quantity);
  assert.equal(inventorySignedDelta('adjust_out',quantity),-quantity);
 }
});
