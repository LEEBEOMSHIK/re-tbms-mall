import {ShopHeader, ShopFooter} from '@/components/shop-shell';
import {CheckoutPreview} from './preview';

export const metadata = {title: '주문서 시안 | RE: TBMS', robots: {index: false, follow: false}};
export default function Page() {
  return <><ShopHeader/><main id="main"><CheckoutPreview/></main><ShopFooter/></>;
}
