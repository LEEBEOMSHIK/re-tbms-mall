import {Suspense} from 'react';
import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {ShopProductDetail} from '@/components/shop-product-detail';
export default async function ProductPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <><ShopHeader/><main id="main"><Suspense fallback={<p role="status">상품을 불러오고 있어요.</p>}><ShopProductDetail key={id} id={id}/></Suspense></main><ShopFooter/></>}
