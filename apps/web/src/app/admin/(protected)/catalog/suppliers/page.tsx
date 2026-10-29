import {requireAdminSession} from '@/lib/admin-session';
import {SupplierManager} from './supplier-manager';
export default async function Page({searchParams}:{searchParams:Promise<{saved?:string;version?:string}>}){
 await requireAdminSession();const query=await searchParams;
 return <SupplierManager mode="list" savedId={typeof query.saved==='string'?query.saved:''} savedVersion={typeof query.version==='string'?query.version:''}/>;
}
