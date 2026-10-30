import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {LiveCheckout} from '@/components/live-checkout';
export const metadata={title:'주문서 | RE: TBMS',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{sku?:string;quantity?:string}>}){const query=await searchParams;return <><ShopHeader/><main id="main"><LiveCheckout key={`${query.sku??"cart"}:${query.quantity??"1"}`} sku={query.sku} quantity={query.quantity}/></main><ShopFooter/></>}
