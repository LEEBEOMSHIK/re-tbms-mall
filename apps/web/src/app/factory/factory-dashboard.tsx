import Link from 'next/link';
import {ValueStatus} from '@/components/ui/key-facts';
import {factoryDashboard,designStages} from '@/lib/factory-dashboard';
import {progressStatusLabels,productionStatusLabels,type FactoryWorkspace as Workspace} from '@/lib/factory';
import './factory-dashboard.css';
import {ShipmentOverview} from '@/components/shipments/shipment-page';

export function FactoryDashboard({workspace}:{workspace:Workspace}){
 const summary=factoryDashboard(workspace);
 return <section className="factory-dashboard" aria-label="공장 업무 요약">
  <ShipmentOverview scope="factory"/>
  <div className="factory-dashboard-metrics">
   <Link className="factory-dashboard-metric" href="/factory/products"><span>담당 상품</span><strong>{summary.productCount}<small>개</small></strong><span className="factory-dashboard-hint">담당 상품 목록 보기 <span aria-hidden="true">→</span></span></Link>
   <Link className="factory-dashboard-metric" href="/factory/products"><span>진행할 시안</span><strong>{summary.designCount}<small>개</small></strong><span className="factory-dashboard-hint">작업 대기·확인 중·샘플 작업</span></Link>
   <Link className="factory-dashboard-metric" href="/factory/production-requests"><span>미처리 제작 요청</span><strong>{summary.requestCount}<small>건</small></strong><span className="factory-dashboard-hint">요청됨·접수됨·제작 중</span></Link>
  </div>
  <p className="factory-dashboard-note">담당 공장의 전체 업무 기준입니다. 목록 화면의 검색·필터와 무관하며, 제작 상태가 재고 수량을 뜻하지 않습니다.</p>
  <section className="factory-dashboard-panel" aria-labelledby="factory-design-distribution"><header><h2 id="factory-design-distribution">시안 진행 현황</h2><span className="factory-dashboard-note">담당 상품 {summary.productCount}개</span></header><ul className="factory-design-stages">{designStages.map(status=><li key={status}><ValueStatus tone={status==='design_complete'?'success':status==='not_started'?'neutral':'info'}>{progressStatusLabels[status]}</ValueStatus><strong>{summary.counts[status]}<small>개</small></strong></li>)}</ul></section>
  <div className="factory-dashboard-columns">
   <section id="factory-design-tasks" tabIndex={-1} className="factory-dashboard-panel" aria-labelledby="factory-design-tasks-heading"><header><h2 id="factory-design-tasks-heading">진행할 시안</h2><Link href="/factory/products" className="factory-dashboard-more">담당 상품 목록 <span aria-hidden="true">→</span></Link></header><p className="factory-dashboard-note">확인 중·샘플 작업·작업 대기 순서로 최대 5개를 표시합니다.</p>{!summary.designTasks.length?<p className="factory-dashboard-empty">{summary.productCount?'진행할 시안이 없습니다.':'아직 배정된 상품이 없습니다.'}</p>:<ul className="factory-dashboard-tasks">{summary.designTasks.map(product=><li key={product.id}><Link href={`/factory/products/${encodeURIComponent(product.id)}/progress`} className="factory-dashboard-task"><div className="factory-dashboard-task-title"><strong>{product.name}</strong><span aria-hidden="true">→</span></div><span className="factory-dashboard-note">{product.internal_name}</span><div className="factory-dashboard-task-meta"><ValueStatus tone={product.progress_status==='not_started'?'neutral':'info'}>{progressStatusLabels[product.progress_status]}</ValueStatus><span>시안 상세</span></div></Link></li>)}</ul>}</section>
   <section className="factory-dashboard-panel" aria-labelledby="factory-request-tasks-heading"><header><h2 id="factory-request-tasks-heading">처리할 제작 요청</h2><Link href="/factory/production-requests" className="factory-dashboard-more">제작 요청 목록 <span aria-hidden="true">→</span></Link></header><p className="factory-dashboard-note">납기가 가까운 요청부터 최대 5건을 표시합니다. 납기 미지정은 뒤에 표시합니다.</p>{!summary.requestTasks.length?<p className="factory-dashboard-empty">처리할 제작 요청이 없습니다.</p>:<ul className="factory-dashboard-tasks">{summary.requestTasks.map(request=><li key={request.id}><Link href={`/factory/production-requests/${encodeURIComponent(request.id)}`} className="factory-dashboard-task"><div className="factory-dashboard-task-title"><strong>{request.product_name}</strong><span aria-hidden="true">→</span></div><span className="factory-dashboard-note">{request.internal_name}</span><div className="factory-dashboard-task-meta"><ValueStatus tone="info">{productionStatusLabels[request.status]}</ValueStatus><strong>{request.lines.reduce((sum,line)=>sum+line.quantity,0)}개</strong><span>납기 {request.due_date||'미지정'}</span></div></Link></li>)}</ul>}</section>
  </div>
 </section>;
}

