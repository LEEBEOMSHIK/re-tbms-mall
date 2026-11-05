import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './admin.css';
import '@/components/ui/management-lists.css';
export const metadata: Metadata = { title: '관리자 | RE:TAG', robots: {index:false,follow:false} };
const adminFont = localFont({
  src: '../../fonts/PretendardVariable.woff2',
  weight: '100 900',
  display: 'swap',
  fallback: ['Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
  adjustFontFallback: false,
});
export default function AdminLayout({children}:{children:React.ReactNode}) {
  return <div className={`management-lists admin-type ${adminFont.className}`}>{children}</div>;
}
