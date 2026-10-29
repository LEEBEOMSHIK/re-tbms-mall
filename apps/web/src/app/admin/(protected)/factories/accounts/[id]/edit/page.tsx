import {requireAdminSession} from '@/lib/admin-session';
import {FactoryAdmin} from '@/app/admin/(protected)/factories/factory-admin';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <FactoryAdmin mode="account-edit" entityId={id}/>;}
