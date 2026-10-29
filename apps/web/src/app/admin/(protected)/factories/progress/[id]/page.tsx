import {requireAdminSession} from '@/lib/admin-session';
import {AdminProgressDetail} from '../admin-progress';

export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string|string[];saved_image?:string|string[]}>}) {
  await requireAdminSession();
  const [{id},query]=await Promise.all([params,searchParams]);
  return <AdminProgressDetail productId={id} mode="view" savedImageId={typeof query.saved_image==='string'?query.saved_image:undefined} savedVersion={typeof query.saved==='string'?query.saved:undefined}/>;
}
