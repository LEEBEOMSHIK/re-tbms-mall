import assert from 'node:assert/strict';
import {wrap,centerU,deltaU,localPercent,atlasCopies} from '../../public/garment-studio/wrap-print.js';
import {snapshot,validate} from '../../public/garment-studio/persistence.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-9);
near(deltaU(.02,1.98),.04);near(deltaU(1.98,.02),-.04);
for(const side of ['front','back'])for(const horizontal of [0,50,100,150,200]){const d={side,horizontal};near(wrap(localPercent(centerU(d),side)/100),wrap(horizontal/100));assert.equal(atlasCopies(d).length,3);}
// Both sides evaluate the same atlas coordinate at each seam.
near(wrap(1),wrap(0+1));near(wrap(0),wrap(1+1));
const s={garment:'hoodie',fabric:'cotton',light:'studio',color:'#ffffff',background:'#888888',wrinkles:false,ruler:false,auto:false,activeId:1,editSide:'front',designs:[{id:1,side:'front',name:'wrap',art:'graphic',size:22,horizontal:50,wrapHorizontal:150,vertical:71,angle:21}]};
const r=snapshot(s);assert.equal(r.version,2);assert.equal(validate(r).designs[0].wrapHorizontal,150);
r.version=1;assert.throws(()=>validate(r));delete r.designs[0].wrapHorizontal;assert.equal(validate(r),r);r.version=2;r.designs[0].wrapHorizontal=201;assert.throws(()=>validate(r));
console.log('PASS wrap seam arithmetic, cross-side anchors, v2 persistence and v1 compatibility');

import {createDesignState} from '../../public/garment-studio/design-state.js';
const st=createDesignState({garment:'hoodie'});st.state.horizontal=150;assert.equal(st.state.horizontal,150);st.state.garment='tshirt';assert.equal(st.state.horizontal,50);st.state.horizontal=40;st.state.garment='hoodie';assert.equal(st.state.horizontal,150);assert.equal(st.active().horizontal,40);
console.log('PASS garment-specific positions preserve hoodie and tee independently');
