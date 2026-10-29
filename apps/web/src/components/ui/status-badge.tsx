import type { ReactNode } from 'react';
import './status-badge.css';

type StatusKind = 'no_options' | 'no_stock' | 'partial_stock' | 'in_stock' | 'unpublished' | 'unknown' | 'low_stock' | 'stock_healthy';
const icons: Record<StatusKind, ReactNode> = {
  low_stock: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.1"/></>,
  stock_healthy: <><circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/></>,
  no_options: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 6h7m-3.5-3.5v7M14 17h7"/></>,
  no_stock: <><path d="M4 12v8h16v-8M4 12h4l2 3h4l2-3h4M12 3v7m-3-3 3 3 3-3"/></>,
  partial_stock: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3v.1"/></>,
  in_stock: <><circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/></>,
  unpublished: <><path d="m3 3 18 18M9 5.5a10 10 0 0 1 3-.5c6 0 10 7 10 7a19 19 0 0 1-4 4.5M6 6.5A19 19 0 0 0 2 12s4 7 10 7a10 10 0 0 0 3-.5"/><path d="M9.5 9.5a3.5 3.5 0 0 0 5 5"/></>,
  unknown: <><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2.2c-1 .7-2 1-2 2.3m0 3v.1"/></>,
};

export function StatusBadge({ kind, children }: { kind: StatusKind; children: ReactNode }) {
  return <span className={`status-badge status-badge--${kind}`}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{icons[kind]}</svg>
    <span>{children}</span>
  </span>;
}
