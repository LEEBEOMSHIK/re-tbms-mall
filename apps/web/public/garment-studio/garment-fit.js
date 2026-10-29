// Visual fit presets, not measured sizes or a sewing-pattern grading system.
export const FITS=['female','male','unisex'];
export const SIZES=['S','M','L','XL'];
const sizes={S:[.94,.96],M:[1,1],L:[1.06,1.04],XL:[1.12,1.08]};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Sampled envelopes of the original fitted hoodie. Interpolate smoothly so
// the entire shell (including lining/rib) receives the same continuous mapping.
const sections=[[-1.1,.43,.48],[-.95,.431,.484],[-.8,.439,.482],[-.6,.423,.383],[-.4,.421,.324],[-.2,.453,.335],[0,.496,.356],[.15,.515,.371],[.3,.411,.373],[.45,.273,.503],[.6,.25,.50]];
function envelope(y,channel){for(let i=1;i<sections.length;i++)if(y<=sections[i][0]){const a=sections[i-1],b=sections[i],t=smooth(a[0],b[0],y);return a[channel]+(b[channel]-a[channel])*t;}return sections.at(-1)[channel];}
export function fitPoint(x,y,z,fit='female',size='M',garment='hoodie'){
 if(!FITS.includes(fit)||!SIZES.includes(size))throw new RangeError('Unknown visual fit or size');
 const [width,length]=sizes[size],torso=1-smooth(.48,.88,Math.abs(x)),waist=Math.exp(-Math.pow((y+.25)/.38,2)),shoulder=smooth(.05,.5,y);
 let sx=1,sz=1,sy=1;
 if(fit!=='female'){const male=fit==='male';sx=(male?1.055:1.075)+torso*(waist*(male?.20:.24)+shoulder*.035);sz=1+torso*waist*.12;sy=male?1.025:1.01;
 // Replace the bust/waist/hip depth profile, rather than only widening it.
 if(garment==='hoodie'){
  const body=torso*(1-smooth(.28,.55,y));
  const frontDepth=male?.365:.385,backDepth=male?.355:.375;
  const signBlend=smooth(-.06,.06,z),frontScale=frontDepth/envelope(y,1),backScale=backDepth/envelope(y,2);
  z*=1+body*((backScale+(frontScale-backScale)*signBlend)-1);
  sz=1;
 }
 }
 return [x*sx*width,(y+.95)*sy*length-.95,z*sz*width];
}
