import {Suspense} from 'react';
import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {CustomerLogin} from '@/components/customer-login';
export default function LoginPage(){return <><ShopHeader/><main id="main"><Suspense fallback={<p role="status">로그인 화면을 불러오고 있어요.</p>}><CustomerLogin/></Suspense></main><ShopFooter/></>}
