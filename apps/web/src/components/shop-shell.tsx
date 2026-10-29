import { SiteSettingsButton } from './site-settings';
import { SiteSettingsContent } from './site-settings-content';
import Link from 'next/link';
import './footer.css';
import './shop.css';
export function ShopHeader() { return <><a className="skip-link" href="#main">본문으로 건너뛰기</a><header className="site-header customer-header"><Link className="wordmark" href="/" aria-label="RE: TBMS 홈">RE: TBMS<span>EVERYDAY WARDROBE</span></Link><nav aria-label="주요 메뉴"><Link href="/products">Shop</Link><Link href="/about">About</Link><SiteSettingsButton><SiteSettingsContent /></SiteSettingsButton></nav></header></>; }
export function ShopFooter() {
  return <footer className="site-footer commerce-footer customer-footer"><div className="footer-columns">
    <section className="footer-brand" aria-labelledby="footer-company"><h2 id="footer-company">RE: TBMS</h2><p>일상에 스며드는 옷</p><dl className="company-details">{['상호','대표자','사업자등록번호','통신판매업 신고번호','사업장 주소','개인정보 보호 담당자'].map(label=><div key={label}><dt>{label}</dt><dd>등록 예정</dd></div>)}</dl></section>
    <nav aria-label="하단 쇼핑 메뉴"><h2>Explore</h2><Link href="/products">전체 상품</Link><Link href="/about">회사 소개</Link></nav>
    <nav aria-label="정책 및 이용 안내"><h2>Information</h2><Link href="/policies/terms">이용약관</Link><Link href="/policies/privacy">개인정보처리방침</Link><Link href="/policies/shipping">배송 안내</Link><Link href="/policies/returns">교환·반품 안내</Link></nav>
    <section aria-labelledby="footer-contact"><h2 id="footer-contact">Customer care</h2><p>고객센터 전화 · 등록 예정</p><p>이메일 · 등록 예정</p><p>상담 시간 · 등록 예정</p><p className="footer-caption">고객 문의 채널은 오픈 전에 안내합니다.</p></section>
  </div><div className="footer-bottom"><span>© RE: TBMS</span><p>RE: TBMS · 일상에 스며드는 옷</p></div></footer>;
}

