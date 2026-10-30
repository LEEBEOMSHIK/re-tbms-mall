import {requireAdminSession} from '@/lib/admin-session';
import {redirect} from 'next/navigation';
export default async function Page({params}:{params:Promise<{id:string}>}) {
  await requireAdminSession();
  const {id}=await params;
  redirect(`/admin/catalog/${encodeURIComponent(id)}#product-basic`);
}
