import {requireAdminSession} from '@/lib/admin-session';
import {AdminProgressDetail} from '../../admin-progress';

export default async function Page({params}:{params:Promise<{id:string}>}) {
  await requireAdminSession();
  const {id}=await params;
  return <AdminProgressDetail productId={id} mode="edit"/>;
}
