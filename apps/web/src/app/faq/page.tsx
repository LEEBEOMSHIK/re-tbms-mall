import {ShopHeader,ShopFooter} from '@/components/shop-shell';
import {FaqPage} from '@/components/faq';
export const metadata={title:'자주 묻는 질문 | RE:TAG'};
export default function Page(){return <><ShopHeader/><main id="main"><FaqPage/></main><ShopFooter/></>;}
