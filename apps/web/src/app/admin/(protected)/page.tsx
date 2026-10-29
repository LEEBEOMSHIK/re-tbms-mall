import { requireAdminSession } from '@/lib/admin-session';
import { DashboardView } from './dashboard-view';
export default async function AdminHome(){
  await requireAdminSession();
  return <DashboardView/>;
}
