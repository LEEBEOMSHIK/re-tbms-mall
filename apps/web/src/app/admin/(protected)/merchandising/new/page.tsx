import { requireAdminSession } from '@/lib/admin-session';
import MerchandisingEditor from '../merchandising-editor';
export default async function NewSectionPage(){await requireAdminSession();return <MerchandisingEditor/>;}
