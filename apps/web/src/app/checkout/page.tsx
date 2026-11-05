import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {LiveCheckout} from '@/components/live-checkout';
import {checkoutEntryPath,parseCheckoutEntry,type CheckoutQuery} from '@/lib/checkout-selection';

export const metadata={title:'주문서 | RE:TAG',robots:{index:false,follow:false}};

export default async function Page({searchParams}:{searchParams:Promise<CheckoutQuery>}) {
 const entry=parseCheckoutEntry(await searchParams);
 return <><ShopHeader/><main id="main"><LiveCheckout key={entry.kind+checkoutEntryPath(entry)} entry={entry}/></main><ShopFooter/></>;
}
