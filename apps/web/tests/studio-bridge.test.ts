import test from 'node:test';
import assert from 'node:assert/strict';
import {studioDocument,studioKey,type StudioState} from '../src/features/garment-designer/studio-model.ts';

const settings={garment:'hoodie',garmentFit:'unisex',garmentSize:'M',hoodFabric:'brushed',fabric:'cotton',color:'#abcdef',background:'#858b90',wrinkles:false,ruler:false,light:'studio',auto:false} as const;
const base:StudioState={version:2,settings,designs:[],activeId:null,editSide:'front'};

test('studio serialization retains placement and owned image but excludes binary data; key ignores property ordering',()=>{
 const studio:StudioState={...base,designs:[{id:1,side:'back',name:'Artwork',art:'upload',size:30,horizontal:50,wrapHorizontal:148,vertical:60,angle:20,asset_id:'asset',sourceBlob:new Blob(['image'])}],activeId:1,editSide:'back'};
 const serialized=studioDocument(studio);
 assert.equal(serialized.studio!.designs[0].asset_id,'asset');
 assert.equal(serialized.studio!.designs[0].wrapHorizontal,148);
 assert.ok(!('sourceBlob' in serialized.studio!.designs[0]));
 assert.equal(serialized.template_id,'hoodie');
 const reordered={...studio,settings:Object.fromEntries(Object.entries(settings).reverse())} as unknown as StudioState;
 assert.equal(studioKey(studio),studioKey(reordered));
 assert.notEqual(studioKey(studio),studioKey({...studio,designs:[{...studio.designs[0],angle:21}]}));
});

test('bridge rejects foreign messages and preserves old work on failed or cancelled asynchronous restore',async()=>{
 const bridgePath='../public/garment-studio/admin-bridge.js',statePath='../public/garment-studio/design-state.js';
 const {createPersistence}=await import(bridgePath),{createDesignState}=await import(statePath);
 const sent:Record<string,unknown>[]=[],handlers:Record<string,(event:Record<string,unknown>)=>Promise<void>>={};
 const parent={postMessage:(message:Record<string,unknown>)=>sent.push(message)},main={inert:false};
 const patches={parent,location:{origin:'http://localhost'},window:{addEventListener:(name:string,fn:(event:Record<string,unknown>)=>Promise<void>)=>{handlers[name]=fn;}},document:{querySelector:()=>main,body:{classList:{toggle:()=>{}}}},fetch:async()=>new Response(null,{status:404}),createImageBitmap:async()=>({close(){}})};
 const previous=new Map<string,PropertyDescriptor|undefined>();
 for(const [key,value] of Object.entries(patches)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
 try{
  const store=createDesignState(settings);let restored=0;
  const bridge=createPersistence({state:store.state,store,onRestore:()=>{restored++;},onBeforeRestore:()=>{},isEditing:()=>false});
  const pending=bridge.initialize();
  const message=(data:Record<string,unknown>,origin='http://localhost',source=parent)=>handlers.message({origin,source,data:{channel:'garment-admin-v1',...data}});
  await message({type:'init',studio:base,assets:{}},'http://evil.example');
  await message({type:'init',studio:base,assets:{}},'http://localhost',{postMessage:()=>0});
  assert.equal(restored,0);
  await message({type:'init',requestId:'first',studio:base,assets:{}});await pending;
  assert.equal(restored,1);assert.ok(sent.some(m=>m.type==='initialized'&&m.requestId==='first'));
  store.state.color='#123456';
  const upload={id:2,side:'front',name:'Image',art:'upload',size:30,horizontal:50,vertical:45,angle:0,asset_id:'image'};
  const replacement={...base,designs:[upload],activeId:2};
  await message({type:'init',requestId:'failure',studio:replacement,assets:{image:'/api/admin/designs/p/assets/image'}});
  assert.equal(store.state.color,'#123456');assert.equal(restored,1);
  assert.ok(sent.some(m=>m.type==='error'&&m.requestId==='failure'));
  let release!:(response:Response)=>void;
  Object.defineProperty(globalThis,'fetch',{configurable:true,writable:true,value:()=>new Promise<Response>(resolve=>{release=resolve;})});
  const late=message({type:'init',requestId:'late',studio:replacement,assets:{image:'/api/admin/designs/p/assets/image'}});
  await message({type:'cancel-init',requestId:'late'});
  release(new Response(new Blob(['image'])));await late;
  assert.equal(store.state.color,'#123456');assert.equal(restored,1);
  await message({type:'lock',locked:true});assert.equal(main.inert,true);
  await message({type:'snapshot',requestId:'save'});
  assert.equal(sent.at(-1)?.type,'snapshot');assert.equal(sent.at(-1)?.requestId,'save');
  await message({type:'lock',locked:false});assert.equal(main.inert,false);
 }finally{for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
