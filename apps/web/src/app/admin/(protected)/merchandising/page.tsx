import { requireAdminSession } from '@/lib/admin-session';
import MerchandisingList from './merchandising-list';
export default async function MerchandisingPage(){await requireAdminSession();return <MerchandisingList/>;}
