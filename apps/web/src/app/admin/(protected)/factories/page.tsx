import {redirect} from 'next/navigation';
import {requireAdminSession} from '@/lib/admin-session';
export default async function Page({searchParams}:{searchParams:Promise<{saved?:string|string[]}>}) {
 await requireAdminSession();const q=await searchParams;
 // Preserve old request-save return links; ordinary entry opens design management.
 if(typeof q.saved==='string'&&q.saved) redirect(`/admin/factories/requests?saved=${encodeURIComponent(q.saved)}`);
 redirect('/admin/factories/progress');
}
