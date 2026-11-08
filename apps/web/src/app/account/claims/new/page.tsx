import {OrderClaims} from '@/components/order-claims';
import {ShopHeader,ShopFooter} from '@/components/shop-shell';
export const metadata={title:'반품·교환 | RE:TAG',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{order_id?:string}>}){const {order_id}=await searchParams;return <><ShopHeader/><main id="main"><OrderClaims mode="new" orderId={order_id}/></main><ShopFooter/></>}
