import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {CheckoutList} from '@/components/live-checkout';
export const metadata={title:'내 주문서 | RE: TBMS',robots:{index:false,follow:false}};
export default function Page(){return <><ShopHeader/><main id="main"><CheckoutList/></main><ShopFooter/></>}
