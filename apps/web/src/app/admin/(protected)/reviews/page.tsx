import {requireAdminSession} from '@/lib/admin-session';
import {AdminReviewList} from './review-pages';
export default async function Page({searchParams}:{searchParams:Promise<{product_id?:string;saved?:string}>}){await requireAdminSession();const q=await searchParams;return <AdminReviewList productId={typeof q.product_id==='string'?q.product_id:''} savedId={typeof q.saved==='string'?q.saved:''}/>}
