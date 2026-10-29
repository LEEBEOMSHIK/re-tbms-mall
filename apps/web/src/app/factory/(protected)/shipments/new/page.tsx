import {requireFactorySession} from '@/lib/factory-session';
import {ShipmentPage} from '@/components/shipments/shipment-page';
export default async function Page({searchParams}:{searchParams:Promise<{product_id?:string;request_id?:string;kind?:string}>}){await requireFactorySession();const q=await searchParams;return <ShipmentPage scope="factory" mode="new" productId={q.product_id} requestId={q.request_id} kind={q.kind==='finished'?'finished':'sample'}/>;}
