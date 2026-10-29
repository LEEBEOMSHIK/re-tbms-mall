import {requireAdminSession} from '@/lib/admin-session';
import {ShipmentPage} from '@/components/shipments/shipment-page';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}){await requireAdminSession();const {id}=await params;const {saved}=await searchParams;return <ShipmentPage scope="admin" mode="detail" id={id} saved={saved}/>;}
