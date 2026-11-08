import {Inquiries} from '@/components/inquiries';
import {ShopHeader,ShopFooter} from '@/components/shop-shell';
export const metadata={title:'1:1 문의 | RE:TAG',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}) {const {id}=await params;return <><ShopHeader/><main id="main"><Inquiries mode="detail" id={id}/></main><ShopFooter/></>;}
