// Two units make a full torso revolution; legacy half-chart coordinates stay valid.
export const wrap=(x)=>((x%2)+2)%2;
export const offset=side=>side==='back'?1:0;
export const centerU=d=>wrap((d.wrapHorizontal??d.horizontal)/100+offset(d.side));
export const deltaU=(a,b)=>wrap(a-b+1)-1;
export const localPercent=(u,side)=>wrap(u-offset(side))*100;
export function atlasCopies(d){const u=centerU(d);return [u-2,u,u+2];}
