import { ShopHeader, ShopFooter } from '@/components/shop-shell';
import { BrandAboutView } from '@/components/brand-about-view';
import { adminApiBase } from '@/lib/admin-session';
import { parsePublicBrand, readBrandBody } from '@/lib/brand-about';
export const dynamic = 'force-dynamic';
export const metadata = { title: '브랜드 소개 | RE: TBMS' };
export default async function About() {
  let data = null;
  try { const response = await fetch(`${adminApiBase()}/api/v1/brand-about`, { cache: 'no-store', signal: AbortSignal.timeout(10000) }); if (response.ok) data = parsePublicBrand(JSON.parse(new TextDecoder().decode(await readBrandBody(response, 131072)))); } catch { /* Never substitute a draft. */ }
  return <><ShopHeader/><main id="main">{data ? <BrandAboutView content={data.content}/> : <section className="empty-state"><h1>브랜드 소개를 불러오지 못했습니다.</h1><p>잠시 후 다시 확인해 주세요.</p><a href="/about" className="text-link">다시 시도</a></section>}</main><ShopFooter/></>;
}
