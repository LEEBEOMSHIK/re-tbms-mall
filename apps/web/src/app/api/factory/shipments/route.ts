import {factoryProxy} from '@/lib/factory-proxy';
import {parseShipment,parseShipments} from '@/lib/shipments';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(request:Request){return factoryProxy(request,'shipments','GET',parseShipments);}
export async function POST(request:Request){return factoryProxy(request,'shipments','POST',parseShipment,{maxBodyLength:65536});}
