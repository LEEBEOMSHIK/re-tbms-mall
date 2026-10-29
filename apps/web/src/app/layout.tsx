import type { Metadata } from 'next';
import { TextSizeControl } from '@/components/text-size-control';
import { ThemeControl } from '@/components/theme-control';
import { themeInitScript } from '@/lib/theme';
import './globals.css';
export const metadata: Metadata = { title: 'RE: TBMS | Everyday Wardrobe', description: '일상에 스며드는 옷. RE: TBMS의 시즌 셀렉션을 만나보세요.', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body><ThemeControl /><TextSizeControl />{children}</body></html>;
}
