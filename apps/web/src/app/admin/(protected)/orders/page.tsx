import {SalesOrders} from '@/components/sales-orders';
import {requireAdminSession} from '@/lib/admin-session';
export const metadata={title:'주문 내역 | RE:TAG',robots:{index:false,follow:false}};
export default async function Page(){await requireAdminSession();return <main id="main"><SalesOrders admin/></main>}
