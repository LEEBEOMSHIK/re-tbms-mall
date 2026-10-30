'use client';
import { useId, useRef, useState } from 'react';
import type { GuideCapture } from '@/lib/admin-guide-captures';

function CaptureImage({ capture }: { capture: GuideCapture }) {
  return <span className="guide-capture-image">
    {/* Authenticated screenshots must bypass the public image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/admin/guide/images/${encodeURIComponent(capture.file)}`} width={capture.width} height={capture.height} alt={capture.alt} loading="lazy" />
    {capture.markers.map((marker, index) => <span key={index} className="guide-capture-marker" aria-hidden="true" style={{ left: `${marker.x}%`, top: `${marker.y}%`, width: `${marker.width}%`, height: `${marker.height}%` }}><span>{index + 1}</span></span>)}
  </span>;
}
export function GuideCaptureView({ capture, title }: { capture: GuideCapture; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [originalSize, setOriginalSize] = useState(false);
  return <figure className="guide-capture" style={{ '--guide-preview-width': `${Math.min(capture.width, 520 * capture.width / capture.height)}px` } as React.CSSProperties}>
    <button ref={trigger} type="button" className="guide-capture-preview" aria-label={`${title} 화면 확대`} aria-haspopup="dialog" onClick={() => { setOriginalSize(false); dialog.current?.showModal(); closeButton.current?.focus(); }}><CaptureImage capture={capture} /><span className="guide-capture-zoom">화면 크게 보기 ↗</span></button>
    <figcaption><p>{capture.caption}</p><ol className="guide-capture-legend">{capture.markers.map((marker, index) => <li key={index}><span aria-hidden="true">{index + 1}</span>{marker.label}</li>)}</ol></figcaption>
    <dialog ref={dialog} className="guide-capture-dialog" style={{ '--guide-image-width': `${capture.width}px`, '--guide-image-ratio': capture.width / capture.height } as React.CSSProperties} aria-labelledby={titleId} onClose={() => trigger.current?.focus()} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current?.close(); } }}>
      <div className="guide-capture-dialog-header"><div><h2 id={titleId}>{title}</h2><p>전체 화면을 맞춰 보여줍니다. 세부 글씨는 원본 크기로 확인하세요.</p></div><button type="button" aria-pressed={originalSize} onClick={() => setOriginalSize(value => !value)}>{originalSize ? '화면에 맞추기' : '원본 크기'}</button><button ref={closeButton} type="button" onClick={() => dialog.current?.close()} aria-label="확대 화면 닫기">닫기 ×</button></div>
      <div className={`guide-capture-scroll${originalSize ? ' is-original' : ' is-fit'}`} tabIndex={0} role="region" aria-label="확대된 화면, 방향키로 스크롤"><CaptureImage capture={capture} /></div>
      <ol className="guide-capture-legend">{capture.markers.map((marker, index) => <li key={index}><span aria-hidden="true">{index + 1}</span>{marker.label}</li>)}</ol>
    </dialog>
  </figure>;
}
