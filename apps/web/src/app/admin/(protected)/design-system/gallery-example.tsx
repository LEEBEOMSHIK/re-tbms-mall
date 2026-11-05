import type { ReactNode } from 'react';
import styles from './gallery.module.css';

export function GalleryExample({title, usage, source, children}: {
  title: string; usage: string; source: string; children: ReactNode;
}) {
  return <section className={styles.example}>
    <header><h2>{title}</h2><p>{usage}</p></header>
    <div className={styles.sample}>{children}</div>
    <footer className={styles.source}>사용처 · {source}</footer>
  </section>;
}
