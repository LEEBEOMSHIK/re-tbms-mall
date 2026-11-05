import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BRAND_ASSETS} from '../src/lib/brand-library.ts';
test('seed catalog points to the three unchanged PNG originals with accurate dimensions and size',()=>{
 assert.equal(BRAND_ASSETS.length,3);
 assert.equal(new Set(BRAND_ASSETS.map(a=>a.file)).size,3);
 for(const asset of BRAND_ASSETS){
  assert.match(asset.file,/^logo_(long|short|icon)\.png$/);
  const bytes=readFileSync(new URL(`../public/images/identity/${asset.file}`,import.meta.url));
  assert.equal(bytes.readUInt32BE(16),asset.width);
  assert.equal(bytes.readUInt32BE(20),asset.height);
  assert.equal(bytes.length,asset.bytes);
  assert.ok(asset.title && asset.usage);
 }
});

import {parseLogoContent,parseLogoPublished,parseLogoFile,logoPayload} from '../src/lib/brand-library-contract.ts';
const file={id:'logo_long',file:'logo_long.png',width:2172,height:724,bytes:428477};
const content={assets:[{...file,asset_id:file.id,title:'Logo',usage:'Reference'}],notes:'New version'};
test('factory response strips administrator fields and payload omits untrusted file metadata',()=>{
 const parsed=parseLogoPublished({published_version:2,published_at:'2026-11-02T00:00:00Z',content,draft:content,available:[file]});
 assert.deepEqual(Object.keys(parsed).sort(),['content','published_at','published_version']);
 assert.deepEqual(logoPayload(parsed.content),{notes:'New version',assets:[{asset_id:file.id,title:'Logo',usage:'Reference'}]});
});
test('reject invalid files, inconsistent references, duplicate and empty contents',()=>{
 for(const change of [{id:'../../secret'},{file:'../logo.png'},{width:4097},{bytes:2097153},{height:0}])assert.throws(()=>parseLogoFile({...file,...change}));
 for(const assets of [[],[content.assets[0],content.assets[0]],[{...content.assets[0],asset_id:'logo_icon'}]])assert.throws(()=>parseLogoContent({...content,assets}));
 assert.throws(()=>parseLogoContent({...content,notes:' '}));
});
test('API seed originals are byte identical to the preserved website originals',()=>{
 for(const asset of BRAND_ASSETS)assert.deepEqual(readFileSync(new URL(`../../../services/api/app/data/brand-library/${asset.file}`,import.meta.url)),readFileSync(new URL(`../public/images/identity/${asset.file}`,import.meta.url)));
});
