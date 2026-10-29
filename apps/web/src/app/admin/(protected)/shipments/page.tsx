import {requireAdminSession} from '@/lib/admin-session';
import {ShipmentPage} from '@/components/shipments/shipment-page';
export default async function Page({searchParams}:{searchParams:Promise<{product_id?:string;request_id?:string}>}){await requireAdminSession();const q=await searchParams;return <ShipmentPage scope="admin" mode="list" productId={q.product_id} requestId={q.request_id}/>;}
