import {Suspense} from 'react';
import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {ShopProducts} from '@/components/shop-products';
export default function ProductsPage(){return <><ShopHeader/><main id="main"><Suspense fallback={<p role="status">상품을 불러오고 있어요.</p>}><ShopProducts/></Suspense></main><ShopFooter/></>}
