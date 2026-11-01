import {SalesOrders} from '@/components/sales-orders';
import {ShopHeader,ShopFooter} from '@/components/shop-shell';
export const metadata={title:'주문 내역 | RE:TAG',robots:{index:false,follow:false}};
export default async function Page(){return <><ShopHeader/><main id="main"><SalesOrders/></main><ShopFooter/></>}
