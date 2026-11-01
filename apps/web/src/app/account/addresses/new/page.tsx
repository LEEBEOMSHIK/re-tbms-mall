import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {CustomerAccount} from '@/components/customer-account';
export const metadata={title:'마이페이지 | RE:TAG',robots:{index:false,follow:false}};
export default function Page(){return <><ShopHeader/><main id="main"><CustomerAccount view="address" /></main><ShopFooter/></>}
