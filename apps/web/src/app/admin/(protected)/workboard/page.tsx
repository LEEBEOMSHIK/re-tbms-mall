import { requireAdminSession } from '@/lib/admin-session';
import type { Metadata } from 'next';
import Link from 'next/link';
import { readWorkboard } from '@/lib/workboard-server';
import './workboard.css';
import { WorkboardColumn } from './workboard-column';
export const metadata: Metadata = {title:'공유 작업 보드 | RE:TAG',robots:{index:false,follow:false}};
const columns = [{id:'in-progress',label:'진행 중'},{id:'next',label:'다음 작업 제안'},{id:'decision',label:'결정할 일'},{id:'done',label:'완료'}];
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function Workboard(){
  await requireAdminSession();
  let result;
  try { result = await readWorkboard(); }
  catch { return <main id="main" className="workboard"><h1>작업 보드를 불러올 수 없습니다</h1><p role="alert">workboard.md 파일과 편집 형식을 확인한 뒤 새로고침해 주세요. 오류가 있는 보드는 일부만 표시하지 않습니다.</p><a className="text-link" href="/admin/workboard/source">Markdown 원본 확인</a></main>; }
  const { board, source } = result;
  return <><main id="main" className="workboard"><header className="board-heading"><div><p className="eyebrow">PROJECT WORKBOARD</p><h1>{board.title}</h1><p>다음 할 일과 결정할 일을 한곳에서 확인합니다.</p></div><nav aria-label="관리 작업 메뉴"><Link className="text-link" href="/admin/merchandising">진열 관리</Link><Link className="text-link" href="/">쇼핑 화면 ↗</Link></nav></header>
    <aside className="board-note" aria-label="작업 보드 이용 안내"><p><strong>저장소 문서를 기반으로 한 읽기 전용 보드입니다.</strong> 저장소의 workboard.md를 수정한 뒤 이 화면을 새로고침해 주세요. 변경 요청을 대화에서 알려주셔도 문서에 반영합니다. 에이전트의 실행 상태를 자동 추적하는 화면은 아닙니다.</p><p>원본: <code>workboard.md</code> · 문서 갱신 {board.updatedAt} · 최근 검증 기준일 {board.lastVerifiedAt}</p><p>{board.verificationNote}</p><p>관리자 로그인 후 확인하는 로컬 공유용 보드입니다. 개인정보·접근 키·내부 비밀정보를 기록하지 않습니다.</p></aside>
    <details className="board-source"><summary>workboard.md 원문 보기</summary><p><a className="text-link" href="/admin/workboard/source">Markdown 파일 열기</a> · 원본은 일반 텍스트로 제공됩니다.</p><pre tabIndex={0} aria-label="작업 보드 Markdown 원본">{source}</pre></details>
    <nav className="board-summary" aria-label="작업 상태 바로가기">{columns.map(column=><a key={column.id} href={`#board-${column.id}`}><strong>{board.items.filter(item=>item.status===column.id).length}</strong><span>{column.label}</span></a>)}</nav>
    <div className="board-columns">{columns.map(column=><WorkboardColumn key={column.id} id={column.id} label={column.label} items={board.items.filter(item=>item.status===column.id)} />)}</div>
    <p className="board-footnote">다음 작업은 제안이며, 미정 사업 정책이나 외부 서비스 도입을 확정하지 않습니다.</p></main></>;
}

