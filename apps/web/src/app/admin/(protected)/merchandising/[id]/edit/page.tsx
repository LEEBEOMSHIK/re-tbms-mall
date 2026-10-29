import { requireAdminSession } from '@/lib/admin-session';
import MerchandisingEditor from '../../merchandising-editor';
export default async function EditSectionPage({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <MerchandisingEditor sectionId={id}/>;}
