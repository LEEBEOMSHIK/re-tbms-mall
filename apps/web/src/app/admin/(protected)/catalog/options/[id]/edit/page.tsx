import {requireAdminSession} from '@/lib/admin-session';
import {ReorderPointEditor} from '@/app/admin/(protected)/catalog/reorder-point-editor';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <ReorderPointEditor key={id} skuId={id}/>;}
