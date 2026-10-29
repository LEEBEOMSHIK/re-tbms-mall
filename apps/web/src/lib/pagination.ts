export const inventoryPageSizes = [10,20,50,100] as const;
export function pageRange(total: number, requestedPage: number, pageSize: number) {
  const count = Math.max(0,Math.floor(total));
  const size = inventoryPageSizes.includes(pageSize as typeof inventoryPageSizes[number]) ? pageSize : 20;
  const pages = Math.ceil(count/size);
  const page = Math.min(Math.max(1,Math.floor(requestedPage)||1),Math.max(1,pages));
  const start = count ? (page-1)*size : 0;
  return {page,pages,size,start,end:Math.min(start+size,count),total:count};
}
export function pageButtons(page: number,pages: number): (number|'gap')[] {
  if(pages<=0)return [];
  const selected = [...new Set([1,pages,page-1,page,page+1].filter(value=>value>=1&&value<=pages))].sort((a,b)=>a-b);
  const buttons:(number|'gap')[]=[];
  for(const value of selected){
    const previous=buttons.at(-1);
    if(typeof previous==='number'&&value-previous>1)buttons.push('gap');
    buttons.push(value);
  }
  return buttons;
}
