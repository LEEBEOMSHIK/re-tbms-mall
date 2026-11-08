import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFaq,parseFaqList} from '../src/lib/faq.ts';
const value={id:'203be82d-97d1-43a9-aa16-ce74b46f335a',category:'shipping',question:'배송 안내',answer:'답변\n두 번째 줄',position:0,published:false,version:1};
test('FAQ response keeps plain text and visibility',()=>{assert.deepEqual(parseFaq(value),value);assert.deepEqual(parseFaqList({items:[value]}),[value]);});
test('invalid FAQ responses cannot enter the UI',()=>{for(const patch of [{category:'unknown'},{answer:''},{question:' '},{position:-1},{published:'true'},{version:0},{answer:'x'.repeat(5001)}])assert.throws(()=>parseFaq({...value,...patch}));assert.throws(()=>parseFaqList({items:Array(501).fill(value)}));});
