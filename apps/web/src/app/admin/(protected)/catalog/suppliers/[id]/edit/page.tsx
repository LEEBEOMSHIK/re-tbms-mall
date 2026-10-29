import {requireAdminSession} from '@/lib/admin-session';
import {SupplierManager} from '../../supplier-manager';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <SupplierManager mode="edit" supplierId={id}/>;}
