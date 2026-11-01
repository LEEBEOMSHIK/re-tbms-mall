import type { Metadata } from 'next';
import { TextSizeControl } from '@/components/text-size-control';
import { ThemeControl } from '@/components/theme-control';
import { themeInitScript } from '@/lib/theme';
import './globals.css';
export const metadata: Metadata = { title: 'RE:TAG | Tag a New Possibility', description: '나의 취향을 입는 그래픽 의류. RE:TAG의 독특한 디자인으로 나만의 스타일을 완성하세요.', icons: {icon: '/images/identity/logo_icon.png', apple: '/images/identity/logo_icon.png'}, robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body><ThemeControl /><TextSizeControl />{children}</body></html>;
}
