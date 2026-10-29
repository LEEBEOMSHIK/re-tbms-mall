import {requireAdminSession} from '@/lib/admin-session';
import {SupplierManager} from '../supplier-manager';
export default async function Page(){await requireAdminSession();return <SupplierManager mode="new"/>;}
