// Each print owns its placement and image; switching sides never moves a print.
export function createDesignState(base){
 let nextId=1;
 const defaults={art:'none',size:43,horizontal:50,vertical:43,angle:0,upload:null};
 const state={...base,designs:[],activeId:null,editSide:'front'};
 const active=()=>state.designs.find(d=>d.id===state.activeId)||null;
 function add(art,side=state.editSide,upload=null,name=''){
  const count=state.designs.filter(d=>d.side===side).length;
  const d={...defaults,id:nextId++,art,side,upload,name:name||(art==='graphic'?'그래픽':'타이포'),size:count?30:43,horizontal:50,vertical:Math.min(70,43+count*12)};
  state.designs.push(d);select(d.id);return d;
 }
 function select(id){const d=state.designs.find(d=>d.id===id);state.activeId=d?.id??null;if(d)state.editSide=d.side;return d;}
 function side(value){state.editSide=value;state.activeId=state.designs.find(d=>d.side===value)?.id??null;}
 function remove(){const d=active();if(!d)return;d.upload?.close();state.designs=state.designs.filter(x=>x.id!==d.id);state.activeId=state.designs.filter(x=>x.side===state.editSide).at(-1)?.id??null;}
 function reset(){state.designs.forEach(d=>d.upload?.close());state.designs=[];state.activeId=null;state.editSide='front';add('type');}
 for(const k of Object.keys(defaults))Object.defineProperty(state,k,{get:()=>{const d=active();return k==='horizontal'&&state.garment==='hoodie'?(d?.wrapHorizontal??d?.horizontal??defaults[k]):d?.[k]??defaults[k];},set:v=>{const d=active();if(d)d[k==='horizontal'&&state.garment==='hoodie'?'wrapHorizontal':k]=v;},enumerable:true,configurable:true});
 Object.defineProperty(state,'side',{get:()=>state.editSide,set:side,enumerable:true,configurable:true});
 function replace(designs,activeId,editSide){state.designs.forEach(d=>d.upload?.close());state.designs=designs;state.activeId=activeId;state.editSide=editSide;nextId=Math.max(0,...designs.map(d=>d.id))+1;}
 reset();return {state,active,add,select,side,remove,reset,replace};
}
