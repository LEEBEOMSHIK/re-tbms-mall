import {SalesOrders} from '@/components/sales-orders';
import {ShopHeader,ShopFooter} from '@/components/shop-shell';
export const metadata={title:'주문 내역 | RE: TBMS',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><ShopHeader/><main id="main"><SalesOrders key={id} id={id}/></main><ShopFooter/></>}
