import test from 'node:test';
import assert from 'node:assert/strict';
import {parseProductImage,parseProductImages} from '../src/lib/product-images.ts';
const image={id:'image1',product_id:'product1',kind:'design',name:'sample.png',alt:'시안 정면',data_url:'data:image/png;base64,aGVsbG8='};
test('image response rejects external or executable sources and unknown classifications',()=>{
 for(const data_url of ['https://example.com/a.png','javascript:alert(1)','data:image/svg+xml;base64,aGVsbG8=','data:text/html;base64,aGVsbG8=','data:image/png;base64,%%%']) assert.throws(()=>parseProductImage({...image,data_url}));
 assert.throws(()=>parseProductImage({...image,kind:'public'}));
 assert.equal(parseProductImage({...image,alt:''}).alt,'');
 for(const alt of [null,undefined,123,'a'.repeat(241)]) assert.throws(()=>parseProductImage({...image,alt}));
 assert.throws(()=>parseProductImage({...image,name:''}));
 assert.throws(()=>parseProductImage({...image,data_url:'data:image/png;base64,'+'a'.repeat(3*1024*1024)}));
});
test('image list preserves separate roles and rejects duplicates and excessive results',()=>{
 const rows=['design','model','garment'].map((kind,i)=>({...image,id:String(i),kind}));
 assert.deepEqual(parseProductImages({images:rows}).images,rows);
 assert.throws(()=>parseProductImages({images:[image,image]}));
 assert.throws(()=>parseProductImages({images:Array.from({length:31},(_,i)=>({...image,id:String(i)}))}));
 assert.deepEqual(parseProductImages({images:[]}),{images:[]});
});
