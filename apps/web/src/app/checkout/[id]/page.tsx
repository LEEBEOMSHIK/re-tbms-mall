import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {LiveCheckout} from '@/components/live-checkout';
export const metadata={title:'내 주문서 | RE:TAG',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><ShopHeader/><main id="main"><LiveCheckout key={id} id={id}/></main><ShopFooter/></>}
