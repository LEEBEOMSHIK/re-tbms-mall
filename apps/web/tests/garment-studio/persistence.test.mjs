import assert from 'node:assert/strict';
import {snapshot,validate,fingerprint,createPersistence} from '../../public/garment-studio/persistence.js';
import {createDesignState} from '../../public/garment-studio/design-state.js';
const base={fabric:'cotton',color:'#e3dfd3',wrinkles:false,background:'#858b90',ruler:false,light:'studio',auto:false};
const store=createDesignState(base),s=store.state;
const record=snapshot(s);assert.equal(validate(record),record);const initial=fingerprint(s);
s.horizontal=40;assert.notEqual(fingerprint(s),initial);assert.equal(record.designs[0].horizontal,50);
for(const mutate of [r=>r.version=9,r=>r.settings.color='invalid',r=>r.designs[0].size=Infinity,r=>r.designs[0].angle=181,r=>r.designs.push({...r.designs[0]}),r=>r.designs[0].art='upload',r=>r.activeId=999]){const r=structuredClone(record);mutate(r);assert.throws(()=>validate(r));}
let closeCount=0;store.add('upload','back',{close(){closeCount++;}},'fixture').sourceBlob=new Blob(['test'],{type:'image/png'});assert.ok(validate(snapshot(s)));store.replace([],null,'back');assert.equal(closeCount,1);
// Failed loads must leave unsaved work dirty and trigger the unload guard.
const elements=new Map();globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,{dataset:{}});return elements.get(id);},querySelector(){return {};},addEventListener(){}};
const handlers={};globalThis.window={addEventListener(k,fn){handlers[k]=fn;}};
globalThis.indexedDB={open(){const req={};queueMicrotask(()=>{req.error=Error('test storage denied');req.onerror();});return req;}};
const persistence=createPersistence({state:s,store,onRestore(){},onBeforeRestore(){},isEditing:()=>false});
await persistence.initialize();let warned=false;handlers.beforeunload({preventDefault(){warned=true;}});assert.ok(warned);assert.match(elements.get('save-result').textContent,/불러오기 실패/);assert.equal(elements.get('save-result').dataset.error,'true');
await persistence.save(true);assert.match(elements.get('save-result').textContent,/저장 실패/);assert.equal(s.designs.length,0);
console.log('PASS snapshots, settings/transform validation, Blob retention, atomic replacement cleanup, failed read/write retention & unload guard');

const hoodieRecord=snapshot({fabric:'cotton',color:'#ffffff',background:'#858b90',wrinkles:false,ruler:false,auto:false,light:'studio',garment:'hoodie',hoodFabric:'brushed',designs:[],activeId:null,editSide:'front'});
validate(hoodieRecord);
assert.equal(hoodieRecord.settings.garment,'hoodie');
assert.equal(hoodieRecord.settings.hoodFabric,'brushed');
assert.throws(()=>validate({...hoodieRecord,settings:{...hoodieRecord.settings,hoodFabric:'invalid'}}));
console.log('PASS hoodie settings roundtrip and invalid fabric rejection');
