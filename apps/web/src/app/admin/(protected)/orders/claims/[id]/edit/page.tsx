import {OrderClaims} from '@/components/order-claims';
import {requireAdminSession} from '@/lib/admin-session';
export const metadata={title:'반품·교환 | RE:TAG',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>;searchParams:Promise<{order_id?:string}>}){await requireAdminSession();const {id}=await params;return <main id="main"><OrderClaims admin mode="edit" id={id}/></main>}
