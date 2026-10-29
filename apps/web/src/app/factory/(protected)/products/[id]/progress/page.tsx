import {requireFactorySession} from '@/lib/factory-session';
import {FactoryProgressPage} from '@/app/factory/factory-progress-page';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string|string[]}>}){await requireFactorySession();const {id}=await params;const query=await searchParams;return <FactoryProgressPage productId={id} mode="view" savedVersion={typeof query.saved==='string'?query.saved:undefined}/>;}
