import {requireAdminSession} from '@/lib/admin-session';
import {FactoryAdmin} from '@/app/admin/(protected)/factories/factory-admin';
export default async function Page({searchParams}:{searchParams:Promise<{product_id?:string|string[]}>}){await requireAdminSession();const q=await searchParams;return <FactoryAdmin mode="request-new" productId={typeof q.product_id==='string'?q.product_id:''}/>;}
