import {requireAdminSession} from '@/lib/admin-session';
import {DesignList} from '@/features/garment-designer/designer-pages';
export default async function DesignsPage(){await requireAdminSession();return <DesignList/>;}
