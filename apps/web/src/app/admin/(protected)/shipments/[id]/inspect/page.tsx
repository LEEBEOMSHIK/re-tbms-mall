import {requireAdminSession} from '@/lib/admin-session';
import {ShipmentPage} from '@/components/shipments/shipment-page';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <ShipmentPage scope="admin" mode="inspect" id={id}/>;}
