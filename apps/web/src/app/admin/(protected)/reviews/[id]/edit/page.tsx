import {requireAdminSession} from '@/lib/admin-session';
import {AdminReviewEditor} from '../../review-pages';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminSession();const {id}=await params;return <AdminReviewEditor id={id}/>}
