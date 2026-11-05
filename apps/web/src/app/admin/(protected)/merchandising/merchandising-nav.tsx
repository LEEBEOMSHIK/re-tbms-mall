import Link from 'next/link';

export function MerchandisingNav({current}: {current: 'products' | 'hero'}) {
  return <nav className="merchandising-nav" aria-label="홈 진열 관리">
    <Link href="/admin/merchandising" aria-current={current === 'products' ? 'page' : undefined}>상품 진열</Link>
    <Link href="/admin/merchandising/hero" aria-current={current === 'hero' ? 'page' : undefined}>상단 광고</Link>
  </nav>;
}
