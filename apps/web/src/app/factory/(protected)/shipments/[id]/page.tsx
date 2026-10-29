import {requireFactorySession} from '@/lib/factory-session';
import {ShipmentPage} from '@/components/shipments/shipment-page';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}){await requireFactorySession();const {id}=await params;const {saved}=await searchParams;return <ShipmentPage scope="factory" mode="detail" id={id} saved={saved}/>;}
