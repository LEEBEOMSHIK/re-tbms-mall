import {requireFactorySession} from '@/lib/factory-session';
import {FactoryWorkspace} from '../../../factory-workspace';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireFactorySession();const {id}=await params;return <FactoryWorkspace mode="product" entityId={id}/>;}
