import {requireAdminSession} from '@/lib/admin-session';
import {AdminReviewDetail} from '../review-pages';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <AdminReviewDetail id={id}/>}
