'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import './save-result.css';

/** Render only after a validated save response. Mounting moves focus to the result. */
export function SaveResult({ title, status = '저장 완료', children, actions, className = '' }: {
  title: string; status?: string; children: ReactNode; actions: ReactNode; className?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: 'start' });
  }, []);
  return <section className={`ds-save-result ${className}`}>
    <p className="ds-save-result-status">{status}</p>
    <h2 ref={heading} tabIndex={-1}>{title}</h2>
    <div className="ds-save-result-content">{children}</div>
    <div className="ds-save-result-actions">{actions}</div>
  </section>;
}
