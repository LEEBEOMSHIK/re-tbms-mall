import {requireFactorySession} from '@/lib/factory-session';
import {FactoryProgressPage} from '@/app/factory/factory-progress-page';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireFactorySession();const {id}=await params;return <FactoryProgressPage productId={id} mode="edit"/>;}
