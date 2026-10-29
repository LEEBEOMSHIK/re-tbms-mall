import {requireFactorySession} from '@/lib/factory-session';
import {FactoryShell} from '../factory-shell';
export const dynamic='force-dynamic';
export default async function ProtectedFactoryLayout({children}:{children:React.ReactNode}){await requireFactorySession();return <FactoryShell>{children}</FactoryShell>;}
