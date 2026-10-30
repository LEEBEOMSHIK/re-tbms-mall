import type { Metadata } from 'next';
import './admin.css';
import '@/components/ui/management-lists.css';
export const metadata: Metadata = { title: '관리자 | RE: TBMS', robots: {index:false,follow:false} };
export default function AdminLayout({children}:{children:React.ReactNode}) { return <div className="management-lists">{children}</div>; }
