import Image from 'next/image';
import Link from 'next/link';
import styles from './site.module.css';

function Arrow() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>;
}

export default function SiteManagement() {
  return <main id="main" className={'admin-page ' + styles.page}>
    <header className={styles.header}>
      <h1>사이트 관리</h1>
      <p>쇼핑몰 콘텐츠와 관리자 메뉴를 관리합니다.</p>
    </header>
    <nav aria-label="사이트 관리 바로가기" className={styles.workspace}>
      <section className={styles.feature} aria-labelledby="home-content">
        <div className={styles.featureText}>
          <span className={styles.kicker}>쇼핑몰 홈</span>
          <h2 id="home-content"><Link href="/admin/merchandising">홈 진열 관리</Link></h2>
          <p>홈 상단의 광고와 컬렉션별 상품 진열을 관리합니다.</p>
          <div className={styles.actions}>
            <Link className={styles.action} href="/admin/merchandising/hero">상단 광고 설정 <Arrow/></Link>
            <Link className={styles.action} href="/admin/merchandising">진열 목록 열기 <Arrow/></Link>
          </div>
        </div>
        <div className={styles.photo}><Image src="/images/brand/human-ai.png" alt="" fill sizes="(max-width: 639px) 35vw, 240px"/></div>
      </section>
      <div className={styles.tools}>
        <section aria-labelledby="brand-tools">
          <h2 id="brand-tools" className={styles.groupTitle}>브랜드 콘텐츠</h2>
          <div className={styles.brandGrid}>
            <Link href="/admin/brand-about" className={styles.tile} aria-labelledby="brand-story-title">
              <span className={styles.storyArt}><Image src="/images/brand/hidden-patterns.png" alt="" loading="eager" fill sizes="220px"/></span>
              <div className={styles.tileCopy}><h3 id="brand-story-title">브랜드 소개 관리</h3>
                <p>브랜드 이야기와 콘셉트 이미지 편집</p></div>
              <Arrow/>
            </Link>
            <Link href="/admin/brand-library" className={styles.tile} aria-labelledby="brand-files-title">
              <span className={styles.logoArt}><Image src="/images/identity/logo_long.png" alt="" width={105} height={35}/></span>
              <div className={styles.tileCopy}><h3 id="brand-files-title">브랜드 자료실</h3>
                <p>공장에 공유할 로고와 사용 기준 관리</p></div>
              <Arrow/>
            </Link>
          </div>
        </section>
        <section aria-labelledby="faq-tools">
          <h2 id="faq-tools" className={styles.groupTitle}>고객 안내</h2>
          <div className={styles.customerLinks}>
            <Link href="/admin/faq" className={styles.row} aria-labelledby="faq-title">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/></svg>
              <div><h3 id="faq-title">자주 묻는 질문 관리</h3><p>질문·답변과 공개 여부, 노출 순서 관리</p></div><Arrow/>
            </Link>
            <Link href="/admin/inquiries" className={styles.row} aria-labelledby="inquiries-title">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l1.5-4A8.5 8.5 0 1 1 21 11.5Z M8 9h8M8 13h5"/></svg>
              <div><h3 id="inquiries-title">1:1 문의 관리</h3><p>고객 문의 확인과 답변 등록·수정</p></div><Arrow/>
            </Link>
          </div>
        </section>
        <section aria-labelledby="admin-tools">
          <h2 id="admin-tools" className={styles.groupTitle}>관리자 설정</h2>
          <Link href="/admin/navigation" className={styles.row} aria-labelledby="menu-title">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6"/></svg>
            <div><h3 id="menu-title">관리자 메뉴 관리</h3><p>메뉴 그룹 · 순서 · 표시 여부 설정</p></div>
            <Arrow/>
          </Link>
        </section>
      </div>
    </nav>
  </main>;
}
