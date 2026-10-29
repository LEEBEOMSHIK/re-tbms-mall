import {requireAdminSession} from '@/lib/admin-session';
import {DesignLoader} from '@/features/garment-designer/designer-pages';
export default async function EditDesignPage({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <DesignLoader id={id} edit/>;}
