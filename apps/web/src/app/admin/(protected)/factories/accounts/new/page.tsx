import {requireAdminSession} from '@/lib/admin-session';
import {FactoryAdmin} from '@/app/admin/(protected)/factories/factory-admin';
export default async function Page(){await requireAdminSession();return <FactoryAdmin mode="account-new"/>;}
