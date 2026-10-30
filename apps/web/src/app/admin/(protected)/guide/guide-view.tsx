'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ADMIN_GUIDES } from '@/lib/admin-guide';
import { GUIDE_CAPTURES } from '@/lib/admin-guide-captures';
import { GuideCaptureView } from './guide-capture';
import './guide.css';

export function AdminGuideView() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(ADMIN_GUIDES[0].id);
  useEffect(() => {
    const selectHash = () => {
      const id = window.location.hash.replace(/^#guide-/, '');
      if (ADMIN_GUIDES.some(guide => guide.id === id)) { setSelectedId(id); }
    };
    selectHash();
    window.addEventListener('hashchange', selectHash);
    return () => window.removeEventListener('hashchange', selectHash);
  }, []);
  const words = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const guides = ADMIN_GUIDES.filter(guide => {
    const text = [guide.title, guide.summary, ...guide.prerequisites, ...guide.steps.flatMap(step => [step.title, step.description]), guide.completion, ...guide.notes].join(' ').normalize('NFKC').toLocaleLowerCase();
    return words.every(word => text.includes(word));
  });
  const guide = guides.find(item => item.id === selectedId) ?? guides[0];
  return <main id="main" className="admin-page admin-guide">
    <header className="guide-heading"><p className="eyebrow">HELP & WORKFLOWS</p><h1>사용 가이드</h1><p>할 일을 선택하고, 화면에 표시된 번호를 따라 진행하세요. 이미지를 누르면 크게 볼 수 있습니다.</p></header>
    <div className="guide-search"><label htmlFor="admin-guide-search">어떤 작업이 궁금한가요?</label><div><input id="admin-guide-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="상품 등록, 재고, 가격, 메뉴 숨김…" /><button type="button" disabled={!query} onClick={() => setQuery('')}>검색 초기화</button></div><p role="status">{guides.length}개 가이드{query.trim() ? ` · “${query.trim()}” 검색 결과` : ''}</p></div>
    {!guide ? <section className="guide-empty"><h2>검색 결과가 없습니다</h2><p>업무 이름이나 화면에 표시된 메뉴 이름으로 다시 검색해 주세요.</p></section> : <div className="guide-layout">
      <nav className="guide-toc" aria-label="사용 가이드 목차"><h2>업무 선택</h2>{guides.map(item => <a key={item.id} href={`#guide-${item.id}`} aria-current={item.id === guide.id ? 'location' : undefined} onClick={() => setSelectedId(item.id)}><span>{item.title}</span><small>{item.steps.length}단계</small></a>)}</nav>
      <section key={guide.id} id={`guide-${guide.id}`} className="guide-article" aria-labelledby={`guide-heading-${guide.id}`}>
        <header><p className="guide-step-count">{guide.steps.length}단계로 따라하기</p><h2 id={`guide-heading-${guide.id}`}>{guide.title}</h2><p>{guide.summary}</p><small>내용 확인 <time dateTime={guide.updatedAt}>{guide.updatedAt}</time></small></header>
        {guide.prerequisites.length > 0 && <details className="guide-preparation"><summary>시작하기 전에 · 준비 사항 확인</summary><ul>{guide.prerequisites.map(line => <li key={line}>{line}</li>)}</ul></details>}
        <h3>진행 순서</h3><ol className="guide-steps">{guide.steps.map((step, index) => <li key={index}>
          <div className="guide-step-heading"><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h4>{step.title}</h4></div><p>{step.description}</p>
          {GUIDE_CAPTURES[`${guide.id}:${index}`] && <GuideCaptureView capture={GUIDE_CAPTURES[`${guide.id}:${index}`]} title={step.title} />}
          {step.href && <Link className="text-link" href={step.href}>{step.linkLabel || '해당 화면 열기'} →</Link>}
        </li>)}</ol>
        <div className="guide-completion"><h3>완료 확인</h3><p>{guide.completion}</p></div>{guide.notes.length > 0 && <details className="guide-notes"><summary>알아두세요</summary><ul>{guide.notes.map(line => <li key={line}>{line}</li>)}</ul></details>}
      </section>
    </div>}
  </main>;
}
