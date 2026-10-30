import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {CustomerAccount} from '@/components/customer-account';
export const metadata={title:'마이페이지 | RE: TBMS',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><ShopHeader/><main id="main"><CustomerAccount key={id} view="address" id={id} /></main><ShopFooter/></>}
