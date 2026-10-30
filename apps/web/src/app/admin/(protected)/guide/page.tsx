import type { Metadata } from 'next';
import { requireAdminSession } from '@/lib/admin-session';
import { AdminGuideView } from './guide-view';
export const metadata: Metadata = {title:'관리자 사용 가이드 | RE: TBMS',robots:{index:false,follow:false}};
export default async function Page(){await requireAdminSession();return <AdminGuideView/>;}
