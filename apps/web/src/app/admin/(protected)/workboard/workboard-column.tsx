'use client';
import {ValueStatus} from '@/components/ui/key-facts';
import { useListPagination } from '@/components/ui/list-pagination';
import type { WorkItem } from '@/lib/workboard';

export function WorkboardColumn({id,label,items}:{id:string;label:string;items:WorkItem[]}) {
  const page=useListPagination(items,id,label);
  return <section className={`board-column board-${id}`} aria-labelledby={`board-${id}`}>
    <div className="board-column-heading"><h2 id={`board-${id}`}>{label}</h2><span>{items.length}</span></div>
    {page.summary}
    {page.items.length===0?<p className="board-empty">표시할 작업이 없습니다.</p>:page.items.map(item=><article className="task-card" key={item.id}>
      <div className="task-meta"><span>{item.id}</span><ValueStatus tone={item.priority==='P0'?'attention':item.priority==='P1'?'info':'neutral'}>{item.priority}</ValueStatus></div><h3>{item.title}</h3><p>{item.summary}</p>
      <p className="task-owner">담당: {item.owner}</p><details className="task-details"><summary>완료 기준·검증 근거</summary><dl><div><dt>완료 기준</dt><dd>{item.acceptance}</dd></div><div><dt>선행 조건</dt><dd>{item.dependency}</dd></div><div><dt>검증</dt><dd>{item.verification}</dd></div></dl></details>
    </article>)}
    {page.navigation}
  </section>;
}
