import {requireAdminSession} from '@/lib/admin-session';
import {AdminProgressList} from './admin-progress';

export default async function Page() {
  await requireAdminSession();
  return <AdminProgressList/>;
}
