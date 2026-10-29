'use client';
import Link from 'next/link';
import {InventoryOverviewPanel} from './inventory-overview';
import { useListPagination } from '@/components/ui/list-pagination';
import { useEffect, useState } from 'react';
import { dashboardDate, filterQna, requestDashboard, type Dashboard, type Shipment } from '@/lib/dashboard';
import './dashboard.css';
import {ShipmentOverview} from '@/components/shipments/shipment-page';
const areaNames={qna:'Q&A',inbound:'입고',shipping:'배송',inventory:'재고'};
const shippingNames={preparing:'출고 준비',in_transit:'배송 중',delayed:'배송 지연',delivered:'배송 완료'};
const inboundNames={expected:'입고 예정',inspection:'검수 중',received:'입고 완료'};
export function DashboardView(){
  const [data,setData]=useState<Dashboard|null>(null);const [state,setState]=useState<'loading'|'ready'|'auth'|'error'>('loading');const [attempt,setAttempt]=useState(0);
  const [qnaFilter,setQnaFilter]=useState<'all'|'unanswered'>('unanswered');const [shippingFilter,setShippingFilter]=useState<'all'|Shipment['status']>('all');
  useEffect(()=>{const controller=new AbortController();requestDashboard({signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])}).then(result=>{if(controller.signal.aborted)return;if(result.ok){setData(result.data);setState('ready');}else setState(result.reason==='auth'?'auth':'error');});return()=>controller.abort();},[attempt]);
  function retry(){setState('loading');setData(null);setAttempt(value=>value+1);}
  const qna=data?filterQna(data.qna,qnaFilter):[];const shipments=data?.shipments.filter(item=>shippingFilter==='all'||item.status===shippingFilter)||[];
  const tasks=[...(data?.tasks || [])].filter(task=>task.area!=='inventory').sort((a,b)=>Number(b.priority==='high')-Number(a.priority==='high'));
  const tasksPage=useListPagination(tasks, '', '처리할 업무');
  const qnaPage=useListPagination(qna,qnaFilter,'Q&A');
  const inboundPage=useListPagination(data?.inbound || [], '', '입고');
  const shippingPage=useListPagination(shipments,shippingFilter,'배송');
  return <main id="main" className="dashboard-page"><header className="dashboard-heading"><div><p className="eyebrow">OPERATIONS OVERVIEW</p><h1>관리자 대시보드</h1><p>확인이 필요한 일부터, 오늘의 운영 현황을 살펴보세요.</p></div><div className="dashboard-shortcuts"><Link href="/admin/catalog">상품 관리 ↗</Link><Link href="/admin/catalog/inventory">재고 관리 ↗</Link><Link href="/admin/merchandising">홈 진열 관리 ↗</Link><Link href="/admin/workboard">프로젝트 작업 보드 ↗</Link></div></header>
    <InventoryOverviewPanel/>
    <ShipmentOverview scope="admin"/>
    <aside className="dashboard-sample"><span className="dashboard-tag">샘플 데이터</span><p>아래 문의·입고 예정·고객 배송 현황은 화면 검토용 예시입니다. 실제 재고와 공장 발송·수령 업무는 위의 영역에서 확인합니다.</p>{data&&<time dateTime={data.as_of}>예시 기준 {dashboardDate(data.as_of)} (한국 시간)</time>}</aside>
    {state==='loading'&&<div className="dashboard-empty" role="status">업무 현황을 불러오고 있습니다.</div>}
    {state==='auth'&&<div className="dashboard-empty" role="alert"><h2>다시 로그인해 주세요</h2><p>관리자 로그인 상태를 확인할 수 없습니다.</p><Link className="text-link" href="/admin/login">로그인 화면으로</Link></div>}
    {state==='error'&&<div className="dashboard-empty" role="alert"><h2>업무 현황을 불러오지 못했습니다</h2><p>서버 연결을 확인한 뒤 다시 시도해 주세요.</p><button className="button" onClick={retry}>다시 불러오기</button></div>}
    {state==='ready'&&data&&<>
      <nav className="dashboard-metrics" aria-label="업무 요약">{[
        ['tasks','처리할 업무',tasks.length,'우선순위 확인'],['qna','미답변 Q&A',data.summary.unanswered_qna,'고객 문의 확인'],['inbound','입고 대기',data.summary.inbound_pending,'예정·검수 건'],['shipping','배송 지연',data.summary.shipping_delayed,'배송 상황 확인'],
      ].map(([id,label,value,hint])=><a className="dashboard-metric" key={id} href={`#${id}`}><span>{label}</span><strong>{value}<small>건</small></strong><span className="metric-hint">{hint} ↘</span></a>)}</nav>
      <div className="dashboard-columns">
        <section className="dashboard-panel dashboard-tasks" id="tasks" tabIndex={-1} aria-labelledby="tasks-title"><div className="dashboard-panel-heading"><div><p className="eyebrow">PRIORITIES</p><h2 id="tasks-title">오늘 처리할 업무</h2></div><span className="small-label">예시 기준일의 업무</span></div>{tasksPage.summary}{tasks.length===0?<p className="dashboard-empty-row">확인이 필요한 업무가 없습니다.</p>:<ul className="dashboard-task-list">{tasksPage.items.map(task=><li key={task.id}><span className={`dashboard-status ${task.priority==='high'?'attention':''}`}>{task.priority==='high'?'우선 확인':'일반'}</span><div><a href={`#${task.area}`}>{task.title} ↗</a><p>{areaNames[task.area]} · {task.due_label}</p></div></li>)}</ul>}{tasksPage.navigation}</section>
        <section className="dashboard-panel" id="qna" tabIndex={-1} aria-labelledby="qna-title"><div className="dashboard-panel-heading"><div><p className="eyebrow">CUSTOMER CARE</p><h2 id="qna-title">들어온 Q&A</h2></div><label className="dashboard-filter">Q&A 보기<select value={qnaFilter} onChange={e=>setQnaFilter(e.target.value as 'all'|'unanswered')}><option value="unanswered">미답변만</option><option value="all">전체 문의</option></select></label></div>{qnaPage.summary}{qna.length===0?<p className="dashboard-empty-row">선택한 조건의 문의가 없습니다.</p>:<div className="dashboard-qna-list">{qnaPage.items.map(item=><details key={item.id}><summary><span className={`dashboard-status ${item.status==='unanswered'?'attention':''}`}>{item.status==='unanswered'?'답변 대기':'답변 완료'}</span><strong>{item.subject}</strong><span className="dashboard-row-meta">{item.product} · {dashboardDate(item.received_at)}</span></summary><p>문의 번호 {item.id} · 상품: {item.product}</p><p>샘플 문의입니다. 문의 본문 연동과 답변 등록 기능은 준비 중입니다.</p></details>)}</div>}{qnaPage.navigation}</section>
        <section className="dashboard-panel" id="inbound" tabIndex={-1} aria-labelledby="inbound-title"><div className="dashboard-panel-heading"><div><p className="eyebrow">INCOMING APPAREL</p><h2 id="inbound-title">의류 입고 현황</h2></div><span className="small-label">예정 → 검수 → 완료</span></div>{inboundPage.summary}{data.inbound.length===0?<p className="dashboard-empty-row">입고 내역이 없습니다.</p>:<div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="의류 입고 표"><table><caption className="sr-only">샘플 의류 입고 목록</caption><thead><tr><th scope="col">상품 / SKU</th><th scope="col">수량</th><th scope="col">예정일</th><th scope="col">상태</th></tr></thead><tbody>{inboundPage.items.map(item=><tr key={item.id}><th scope="row">{item.product}<small>{item.sku}</small></th><td><strong className="dashboard-important-value">{item.quantity.toLocaleString('ko-KR')}벌</strong></td><td>{item.expected_date.slice(0,10)}</td><td><span className={`dashboard-status ${item.status==='inspection'?'attention':''}`}>{inboundNames[item.status]}</span></td></tr>)}</tbody></table></div>}{inboundPage.navigation}</section>
        <section className="dashboard-panel" id="shipping" tabIndex={-1} aria-labelledby="shipping-title"><div className="dashboard-panel-heading"><div><p className="eyebrow">FULFILLMENT</p><h2 id="shipping-title">배송 상태</h2></div><label className="dashboard-filter">배송 보기<select value={shippingFilter} onChange={e=>setShippingFilter(e.target.value as typeof shippingFilter)}><option value="all">전체 배송</option>{Object.entries(shippingNames).map(([value,name])=><option value={value} key={value}>{name}</option>)}</select></label></div>{shippingPage.summary}{shipments.length===0?<p className="dashboard-empty-row">선택한 상태의 배송이 없습니다.</p>:<ul className="dashboard-shipping-list">{shippingPage.items.map(item=><li key={item.id}><div><strong>{item.order_label}</strong><p>{item.item_count}개 품목 · {dashboardDate(item.updated_at)}</p></div><span className={`dashboard-status ${item.status==='delayed'?'attention':item.status==='delivered'?'success':''}`}>{shippingNames[item.status]}</span></li>)}</ul>}<p className="dashboard-panel-note">택배사 조회·송장 등록은 아직 연결되지 않았습니다.</p>{shippingPage.navigation}</section>

      </div><p className="dashboard-footnote">이 구역은 조회용 샘플 데이터입니다. 실제 발송 수령·검수와 입고 확정은 상단의 수령·검수 관리에서 진행합니다.</p>
    </>}
  </main>;
}
