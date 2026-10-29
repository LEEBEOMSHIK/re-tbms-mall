import test from 'node:test';
import assert from 'node:assert/strict';
import {pageRange,pageButtons} from '../src/lib/pagination.ts';
test('pagination handles empty, exact edges, final page and data shrink',()=>{
 assert.deepEqual(pageRange(0,5,20),{page:1,pages:0,size:20,start:0,end:0,total:0});
 assert.deepEqual(pageRange(20,2,20),{page:1,pages:1,size:20,start:0,end:20,total:20});
 assert.deepEqual(pageRange(21,2,20),{page:2,pages:2,size:20,start:20,end:21,total:21});
 assert.equal(pageRange(5,7,10).page,1);
 assert.equal(pageRange(101,9,50).page,3);
 assert.equal(pageRange(100,-1,20).page,1);
 assert.equal(pageRange(100,1,17).size,20);
});
test('filter first then pagination preserves complete filtered totals',()=>{
 const all=Array.from({length:105},(_,id)=>({id,delta:id+1}));
 const filtered=all.filter(row=>row.id%2===0);
 const total=filtered.reduce((sum,row)=>sum+row.delta,0);
 const range=pageRange(filtered.length,3,20);
 const page=filtered.slice(range.start,range.end);
 assert.equal(filtered.length,53);assert.equal(page.length,13);assert.equal(page[0].id,80);
 assert.equal(filtered.reduce((sum,row)=>sum+row.delta,0),total);
});
test('page navigation stays bounded and marks gaps at large page counts',()=>{
 assert.deepEqual(pageButtons(1,0),[]);
 assert.deepEqual(pageButtons(1,1),[1]);
 assert.deepEqual(pageButtons(3,5),[1,2,3,4,5]);
 assert.deepEqual(pageButtons(5000,10000),[1,'gap',4999,5000,5001,'gap',10000]);
 assert.deepEqual(pageButtons(1,10000),[1,2,'gap',10000]);
 assert.deepEqual(pageButtons(10000,10000),[1,'gap',9999,10000]);
});
