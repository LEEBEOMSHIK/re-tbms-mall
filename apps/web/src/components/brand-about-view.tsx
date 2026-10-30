import Image from 'next/image';
import Link from 'next/link';
import { brandImageUrl, CONCEPT_CAPTION, type BrandContent } from '@/lib/brand-about';
import './brand-about-view.css';
export function BrandAboutView({ content, preview = false }: { content: BrandContent; preview?: boolean }) {
  const Title = preview ? 'h2' : 'h1';
  const SectionTitle = preview ? 'h3' : 'h2';
  const TopicTitle = preview ? 'h4' : 'h3';
  return <article className="brand-story">
    <header className="brand-statement"><div><p className="eyebrow">{content.eyebrow}</p><Title className="brand-title">{content.title}</Title></div><div className="brand-intro"><p>{content.intro}</p><Link className="text-link" href="/products">나의 취향에 맞는 옷 찾기 ↗</Link></div></header>
    <figure className="brand-hero"><Image src={brandImageUrl(content.hero_image, preview)} alt={content.hero_alt} width={1536} height={1024} unoptimized={!content.hero_image.startsWith('/images/brand/')} sizes="(max-width: 700px) 100vw, 90vw" preload/><figcaption>{CONCEPT_CAPTION}</figcaption></figure>
    {content.topics.length > 0 && <section className="brand-explorations" aria-label="취향을 담은 그래픽 의류"><div className="brand-section-heading"><p className="eyebrow">GRAPHIC WEAR</p><SectionTitle className="brand-section-title">취향을 담은 그래픽 의류.</SectionTitle></div><div className="brand-topics">{content.topics.map((topic, i) => <section key={topic.id} className="brand-topic"><figure><Image src={brandImageUrl(topic.image, preview)} alt={topic.alt} width={1024} height={1280} unoptimized={!topic.image.startsWith('/images/brand/')} sizes="(max-width: 700px) 100vw, 45vw"/><figcaption>{CONCEPT_CAPTION}</figcaption></figure><div className="brand-topic-copy"><span className="brand-topic-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><div><TopicTitle className="brand-topic-title">{topic.title}</TopicTitle><p>{topic.description}</p></div></div></section>)}</div></section>}
    <footer className="brand-closing"><p>취향이 모여, 나를 말하는 옷.</p><Link className="text-link" href="/products">컬렉션 둘러보기 ↗</Link></footer>
  </article>;
}
