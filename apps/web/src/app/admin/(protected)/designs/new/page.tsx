import {requireAdminSession} from '@/lib/admin-session';
import {DesignNew} from '@/features/garment-designer/designer-pages';
export default async function NewDesignPage(){await requireAdminSession();return <DesignNew/>;}
