import {requireAdminSession} from '@/lib/admin-session';
import {FactoryAdmin} from '@/app/admin/(protected)/factories/factory-admin';
export default async function Page({searchParams}:{searchParams:Promise<{saved?:string|string[]}>}){await requireAdminSession();const q=await searchParams;return <FactoryAdmin mode="requests" savedId={typeof q.saved==='string'?q.saved:''}/>;}
