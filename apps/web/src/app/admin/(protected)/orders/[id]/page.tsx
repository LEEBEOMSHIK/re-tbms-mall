import {SalesOrders} from '@/components/sales-orders';
import {requireAdminSession} from '@/lib/admin-session';
export const metadata={title:'주문 내역 | RE:TAG',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <main id="main"><SalesOrders key={id} admin id={id}/></main>}
