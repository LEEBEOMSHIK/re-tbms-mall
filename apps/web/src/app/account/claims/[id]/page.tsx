import {OrderClaims} from '@/components/order-claims';
import {ShopHeader,ShopFooter} from '@/components/shop-shell';
export const metadata={title:'반품·교환 | RE:TAG',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>;searchParams:Promise<{order_id?:string}>}){const {id}=await params;return <><ShopHeader/><main id="main"><OrderClaims mode="detail" id={id}/></main><ShopFooter/></>}
