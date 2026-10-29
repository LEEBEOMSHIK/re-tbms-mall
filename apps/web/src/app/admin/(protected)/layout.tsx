import {AdminSessionGuard} from '../admin-session-guard';
import { requireAdminSession } from '@/lib/admin-session';
import { AdminNavigation } from '../admin-navigation';
export const dynamic = 'force-dynamic';
export default async function ProtectedAdminLayout({children}:{children:React.ReactNode}) {
  const session=await requireAdminSession();
  return <AdminSessionGuard expiresAt={session.expiresAt}><a className="skip-link" href="#main">본문으로 건너뛰기</a><AdminNavigation/>{children}</AdminSessionGuard>;
}
