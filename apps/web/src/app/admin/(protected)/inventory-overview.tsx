'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {StatusBadge} from '@/components/ui/status-badge';
import {dashboardDate} from '@/lib/dashboard';
import {requestInventoryOverview,stockHref,type InventoryOverview} from '@/lib/inventory-overview';

export function InventoryOverviewPanel(){
  const [data,setData]=useState<InventoryOverview|null>(null);
  const [state,setState]=useState<'loading'|'ready'|'auth'|'error'>('loading');
  const reload=useRef<()=>void>(()=>{});
  useEffect(()=>{
    let active=true;let current:AbortController|null=null;
    function load(){
      if(current)return;
      const controller=new AbortController();current=controller;
      setState('loading');setData(null);
      void requestInventoryOverview({signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])}).then(result=>{
        if(!active||controller.signal.aborted)return;
        if(result.ok){setData(result.data);setState('ready');}else setState(result.reason==='auth'?'auth':'error');
      }).finally(()=>{if(current===controller)current=null;});
    }
    const onReturn=()=>{if(document.visibilityState==='visible')load();};
    reload.current=load;load();
    window.addEventListener('focus',onReturn);window.addEventListener('pageshow',onReturn);document.addEventListener('visibilitychange',onReturn);
    return()=>{active=false;current?.abort();window.removeEventListener('focus',onReturn);window.removeEventListener('pageshow',onReturn);document.removeEventListener('visibilitychange',onReturn);};
  },[]);
  return <section className="dashboard-panel dashboard-live-stock" aria-labelledby="live-stock-title">
    <header className="dashboard-panel-heading"><div><p className="eyebrow">실제 등록 데이터</p><h2 id="live-stock-title">현재 재고 현황</h2></div><button className="dashboard-stock-refresh" disabled={state==='loading'} onClick={()=>reload.current()}>{state==='loading'?'조회 중…':'재고 새로 조회'}</button></header>
    <p className="dashboard-panel-note">사용 안 함 옵션을 포함한 보유 재고입니다. 입고·출고·조정이 저장되면 재진입 또는 새로 조회 시 반영됩니다.</p>
    {state==='loading'&&<p className="dashboard-empty-row" role="status">최신 재고를 불러오는 중입니다.</p>}
    {state==='auth'&&<p className="dashboard-stock-error" role="alert">관리자 로그인이 만료되었습니다. <Link href="/admin/login">다시 로그인 →</Link></p>}
    {state==='error'&&<p className="dashboard-stock-error" role="alert">재고를 불러오지 못했습니다. 재고 새로 조회로 다시 확인해 주세요.</p>}
    {state==='ready'&&data&&<>
      <nav className="dashboard-live-metrics" aria-label="실제 재고 요약">
        <Link className="dashboard-metric" href={stockHref('all')}><span>현재 보유 재고</span><strong>{data.total_on_hand.toLocaleString('ko-KR')}<small>개</small></strong><span className="metric-hint">전체 {data.option_count.toLocaleString('ko-KR')}개 옵션 · 재고 보기 →</span></Link>
        <Link className={`dashboard-metric ${data.low_stock_count?'dashboard-metric-low':'dashboard-metric-healthy'}`} href={stockHref('low')}><span>재고 부족 옵션</span><strong>{data.low_stock_count.toLocaleString('ko-KR')}<small>개 옵션</small></strong><span className="metric-hint">옵션별 부족 기준 이하 · 부족 목록 보기 →</span></Link>
      </nav>
      {data.option_count===0?<p className="dashboard-empty-row">등록된 색상·사이즈 옵션이 없습니다.</p>:data.low_stock_count===0?<p className="dashboard-stock-healthy"><StatusBadge kind="stock_healthy">전체 옵션 재고 양호</StatusBadge></p>:<>
        <div className="dashboard-panel-heading"><h3>먼저 확인할 부족 옵션</h3><p className="dashboard-panel-note">현재 수량이 적은 순 · 최대 5개</p></div>
        <ul className="dashboard-stock-preview">{data.low_stock_preview.map(item=><li key={item.id}><Link href={`${stockHref('low')}&product_id=${encodeURIComponent(item.product_id)}`} aria-label={`${item.product_name} ${item.color} ${item.size} 부족 재고 보기`}><div><strong>{item.product_name}</strong><span>{item.color} / {item.size}{!item.is_active?' · 사용 안 함':''}</span></div><div className="dashboard-stock-preview-value"><strong>{item.on_hand.toLocaleString('ko-KR')}개</strong><span>부족 기준 {item.reorder_point.toLocaleString('ko-KR')}개</span></div><StatusBadge kind="low_stock">부족</StatusBadge><span aria-hidden="true">→</span></Link></li>)}</ul>
      </>}
      <p className="dashboard-panel-note">부족: 현재 수량이 옵션별 기준 이하인 경우입니다. <time dateTime={data.as_of}>조회 기준 {dashboardDate(data.as_of)} (한국 시간)</time></p>
    </>}
  </section>;
}
