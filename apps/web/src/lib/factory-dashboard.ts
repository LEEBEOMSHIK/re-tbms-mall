import type {FactoryWorkspace, ProgressStatus} from './factory.ts';

export const designStages:ProgressStatus[]=['not_started','design_review','sample_in_progress','design_complete'];
const activeRequests=new Set(['submitted','accepted','in_production']);
const designPriority:Record<ProgressStatus,number>={design_review:0,sample_in_progress:1,not_started:2,design_complete:3};
/** Summaries use the complete supplier-scoped response, independently of list filters. */
export function factoryDashboard(workspace:FactoryWorkspace){
 const counts=Object.fromEntries(designStages.map(status=>[status,workspace.products.filter(product=>product.progress_status===status).length])) as Record<ProgressStatus,number>;
 const pending=workspace.requests.filter(request=>activeRequests.has(request.status));
 return {
  productCount:workspace.products.length,
  designCount:workspace.products.length-counts.design_complete,
  requestCount:pending.length,
  counts,
  designTasks:workspace.products.filter(product=>product.progress_status!=='design_complete').sort((a,b)=>designPriority[a.progress_status]-designPriority[b.progress_status]||a.internal_name.localeCompare(b.internal_name)).slice(0,5),
  requestTasks:[...pending].sort((a,b)=>(a.due_date||'9999-12-31').localeCompare(b.due_date||'9999-12-31')||a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)).slice(0,5),
 };
}
